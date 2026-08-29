/**
 * Android TV / Fire TV 10-Foot Spatial Focus & D-Pad Navigation Engine
 * Provides deterministic 2-dimensional focus traversal, focus memory/restoration,
 * overscan-safe boundaries, and remote key-event handling.
 */

export type DPadDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface FocusNode {
  id: string;
  zone: string; // e.g. 'sidebar' | 'channel_list' | 'epg_grid' | 'player_osd' | 'modal'
  row: number;
  col: number;
  label?: string;
  disabled?: boolean;
  onSelect?: () => void;
  metadata?: Record<string, any>;
}

export interface FocusZoneConfig {
  id: string;
  trapFocus?: boolean;
  defaultNodeId?: string;
  rememberLastFocus?: boolean;
  navUp?: string;
  navDown?: string;
  navLeft?: string;
  navRight?: string;
}

export class TvFocusEngine {
  private nodes: Map<string, FocusNode> = new Map();
  private zones: Map<string, FocusZoneConfig> = new Map();
  private activeNodeId: string | null = null;
  private zoneLastFocused: Map<string, string> = new Map();
  private focusHistory: string[] = [];
  private listeners: Set<(nodeId: string | null, node: FocusNode | null) => void> = new Set();

  constructor() {
    this.setupDefaultZones();
  }

  private setupDefaultZones(): void {
    this.registerZone({
      id: 'sidebar',
      rememberLastFocus: true,
      navRight: 'channel_grid',
    });
    this.registerZone({
      id: 'channel_grid',
      rememberLastFocus: true,
      navLeft: 'sidebar',
      navDown: 'player_hud',
    });
    this.registerZone({
      id: 'player_hud',
      rememberLastFocus: true,
      navUp: 'channel_grid',
    });
    this.registerZone({
      id: 'modal',
      trapFocus: true,
    });
  }

  public registerZone(config: FocusZoneConfig): void {
    this.zones.set(config.id, config);
  }

  public registerNode(node: FocusNode): void {
    this.nodes.set(node.id, node);
    if (!this.zoneLastFocused.has(node.zone) && !node.disabled) {
      this.zoneLastFocused.set(node.zone, node.id);
    }
    if (!this.activeNodeId && !node.disabled) {
      this.activeNodeId = node.id;
    }
  }

  public unregisterNode(nodeId: string): void {
    this.nodes.delete(nodeId);
    if (this.activeNodeId === nodeId) {
      this.activeNodeId = null;
      // Auto-fallback to another valid node in history or same zone
      this.restoreSensibleFocus();
    }
  }

  public clearZoneNodes(zone: string): void {
    for (const [id, node] of this.nodes.entries()) {
      if (node.zone === zone) {
        this.nodes.delete(id);
      }
    }
    if (this.activeNodeId && !this.nodes.has(this.activeNodeId)) {
      this.activeNodeId = null;
    }
  }

  public getActiveNode(): FocusNode | null {
    if (!this.activeNodeId) return null;
    return this.nodes.get(this.activeNodeId) || null;
  }

  public getActiveNodeId(): string | null {
    return this.activeNodeId;
  }

  public setFocus(nodeId: string, pushHistory = true): boolean {
    const target = this.nodes.get(nodeId);
    if (!target || target.disabled) return false;

    const prev = this.activeNodeId;
    if (prev && pushHistory && prev !== nodeId) {
      this.focusHistory.push(prev);
      if (this.focusHistory.length > 50) this.focusHistory.shift();
    }

    this.activeNodeId = nodeId;
    this.zoneLastFocused.set(target.zone, nodeId);
    this.notifyListeners();
    return true;
  }

  public handleDPad(direction: DPadDirection): { handled: boolean; targetNodeId: string | null } {
    const current = this.getActiveNode();
    if (!current) {
      // If nothing focused, pick the first available node
      const first = Array.from(this.nodes.values()).find((n) => !n.disabled);
      if (first) {
        this.setFocus(first.id);
        return { handled: true, targetNodeId: first.id };
      }
      return { handled: false, targetNodeId: null };
    }

    const currentZone = this.zones.get(current.zone);

    // 1. Check intra-zone navigation first (closest spatial neighbour)
    const nextInZone = this.findClosestNeighbourInZone(current, direction);
    if (nextInZone) {
      this.setFocus(nextInZone.id);
      return { handled: true, targetNodeId: nextInZone.id };
    }

    // 2. If zone traps focus (e.g. active modal/PIN dialog), do not exit zone
    if (currentZone?.trapFocus) {
      return { handled: true, targetNodeId: current.id }; // Trapped
    }

    // 3. Check inter-zone navigation
    let targetZoneId: string | undefined;
    switch (direction) {
      case 'UP':
        targetZoneId = currentZone?.navUp;
        break;
      case 'DOWN':
        targetZoneId = currentZone?.navDown;
        break;
      case 'LEFT':
        targetZoneId = currentZone?.navLeft;
        break;
      case 'RIGHT':
        targetZoneId = currentZone?.navRight;
        break;
    }

    if (targetZoneId) {
      const targetZoneConfig = this.zones.get(targetZoneId);
      // If zone remembers last focus, return to that node if still valid
      if (targetZoneConfig?.rememberLastFocus) {
        const lastId = this.zoneLastFocused.get(targetZoneId);
        if (lastId && this.nodes.has(lastId) && !this.nodes.get(lastId)!.disabled) {
          this.setFocus(lastId);
          return { handled: true, targetNodeId: lastId };
        }
      }

      // Otherwise pick closest spatial node in the target zone
      const targetNode = this.findClosestNodeInTargetZone(current, targetZoneId, direction);
      if (targetNode) {
        this.setFocus(targetNode.id);
        return { handled: true, targetNodeId: targetNode.id };
      }
    }

    return { handled: false, targetNodeId: null };
  }

  public handleSelect(): boolean {
    const current = this.getActiveNode();
    if (current && current.onSelect && !current.disabled) {
      current.onSelect();
      return true;
    }
    return false;
  }

  public handleBack(): boolean {
    // Pop focus history to restore previous focused node
    while (this.focusHistory.length > 0) {
      const prevId = this.focusHistory.pop()!;
      if (this.nodes.has(prevId) && !this.nodes.get(prevId)!.disabled) {
        this.setFocus(prevId, false);
        return true;
      }
    }
    return false;
  }

  public restoreSensibleFocus(): void {
    // 1. Try history
    if (this.handleBack()) return;

    // 2. Try first non-disabled node
    const first = Array.from(this.nodes.values()).find((n) => !n.disabled);
    if (first) {
      this.setFocus(first.id);
    }
  }

  public subscribe(cb: (nodeId: string | null, node: FocusNode | null) => void): () => void {
    this.listeners.add(cb);
    cb(this.activeNodeId, this.getActiveNode());
    return () => this.listeners.delete(cb);
  }

  private notifyListeners(): void {
    const node = this.getActiveNode();
    this.listeners.forEach((cb) => cb(this.activeNodeId, node));
  }

  private findClosestNeighbourInZone(current: FocusNode, dir: DPadDirection): FocusNode | null {
    const candidates = Array.from(this.nodes.values()).filter(
      (n) => n.zone === current.zone && n.id !== current.id && !n.disabled
    );

    let bestNode: FocusNode | null = null;
    let minDistance = Infinity;

    for (const c of candidates) {
      const dRow = c.row - current.row;
      const dCol = c.col - current.col;

      let isCandidateInDirection = false;
      let primaryDiff = 0;
      let secondaryDiff = 0;

      switch (dir) {
        case 'UP':
          if (dRow < 0) {
            isCandidateInDirection = true;
            primaryDiff = Math.abs(dRow);
            secondaryDiff = Math.abs(dCol);
          }
          break;
        case 'DOWN':
          if (dRow > 0) {
            isCandidateInDirection = true;
            primaryDiff = Math.abs(dRow);
            secondaryDiff = Math.abs(dCol);
          }
          break;
        case 'LEFT':
          if (dCol < 0) {
            isCandidateInDirection = true;
            primaryDiff = Math.abs(dCol);
            secondaryDiff = Math.abs(dRow);
          }
          break;
        case 'RIGHT':
          if (dCol > 0) {
            isCandidateInDirection = true;
            primaryDiff = Math.abs(dCol);
            secondaryDiff = Math.abs(dRow);
          }
          break;
      }

      if (isCandidateInDirection) {
        // Weighted distance prioritizing primary direction alignment
        const score = primaryDiff * 10 + secondaryDiff;
        if (score < minDistance) {
          minDistance = score;
          bestNode = c;
        }
      }
    }

    return bestNode;
  }

  private findClosestNodeInTargetZone(
    current: FocusNode,
    targetZone: string,
    dir: DPadDirection
  ): FocusNode | null {
    const candidates = Array.from(this.nodes.values()).filter(
      (n) => n.zone === targetZone && !n.disabled
    );
    if (candidates.length === 0) return null;

    let bestNode: FocusNode | null = null;
    let minScore = Infinity;

    for (const c of candidates) {
      let score = 0;
      if (dir === 'RIGHT') {
        // Find element in target zone with closest row and minimal column
        score = Math.abs(c.row - current.row) * 10 + c.col;
      } else if (dir === 'LEFT') {
        score = Math.abs(c.row - current.row) * 10 - c.col;
      } else if (dir === 'DOWN') {
        score = Math.abs(c.col - current.col) * 10 + c.row;
      } else if (dir === 'UP') {
        score = Math.abs(c.col - current.col) * 10 - c.row;
      }

      if (score < minScore) {
        minScore = score;
        bestNode = c;
      }
    }

    return bestNode || candidates[0];
  }

  public getAllNodes(): FocusNode[] {
    return Array.from(this.nodes.values());
  }

  public getZoneNodes(zone: string): FocusNode[] {
    return Array.from(this.nodes.values()).filter((n) => n.zone === zone);
  }

  public hasNode(nodeId: string): boolean {
    return this.nodes.has(nodeId);
  }

  public getNode(nodeId: string): FocusNode | undefined {
    return this.nodes.get(nodeId);
  }

  public getFocusHistory(): string[] {
    return [...this.focusHistory];
  }

  public reset(): void {
    this.nodes.clear();
    this.zones.clear();
    this.activeNodeId = null;
    this.zoneLastFocused.clear();
    this.focusHistory = [];
    this.setupDefaultZones();
    this.notifyListeners();
  }
}

export const tvFocusEngine = new TvFocusEngine();

