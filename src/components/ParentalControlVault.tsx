import React, { useState, useEffect } from 'react';
import {
  Lock,
  Unlock,
  ShieldAlert,
  ShieldCheck,
  Users,
  KeyRound,
  Eye,
  EyeOff,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Tv,
  Film,
} from 'lucide-react';
import {
  globalParentalControlEngine,
  ParentalVaultStatus,
  UserProfile,
  AgeRating,
  AGE_RATING_WEIGHT,
} from '../lib/parentalControlEngine';

export const ParentalControlVault: React.FC = () => {
  const [vault, setVault] = useState<ParentalVaultStatus>(globalParentalControlEngine.getVaultStatus());
  const [activeProfile, setActiveProfile] = useState<UserProfile>(globalParentalControlEngine.getActiveProfile());
  const [curfewReport, setCurfewReport] = useState<{ isCurfewActive: boolean; message?: string }>(globalParentalControlEngine.checkCurfew());

  // PIN Verification State
  const [inputPin, setInputPin] = useState('');
  const [pinVerificationResult, setPinVerificationResult] = useState<{
    success?: boolean;
    isLockedOut?: boolean;
    remainingAttempts?: number;
    errorReason?: string;
  } | null>(null);

  // New Profile Form
  const [showAddProfile, setShowAddProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileRole, setNewProfileRole] = useState<'kids' | 'teen' | 'guest'>('kids');
  const [newProfileRating, setNewProfileRating] = useState<AgeRating>('PG');
  const [newProfileLimitMin, setNewProfileLimitMin] = useState(90);

  // Channel & Program restriction tester
  const [testChannelName, setTestChannelName] = useState('Playboy TV HD');
  const [testCategory, setTestCategory] = useState('cat_adult');
  const [testProgRating, setTestProgRating] = useState<AgeRating>('TV-MA');

  const refreshState = () => {
    const status = globalParentalControlEngine.getVaultStatus();
    setVault(status);
    setActiveProfile(globalParentalControlEngine.getActiveProfile());
    setCurfewReport(globalParentalControlEngine.checkCurfew());
  };

  useEffect(() => {
    refreshState();
  }, []);

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    const res = globalParentalControlEngine.verifyPin(inputPin);
    setPinVerificationResult(res);
    setInputPin('');
    refreshState();
  };

  const handleSwitchProfile = (profileId: string) => {
    globalParentalControlEngine.switchProfile(profileId);
    setPinVerificationResult(null);
    refreshState();
  };

  const handleCreateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;

    globalParentalControlEngine.createProfile({
      name: newProfileName,
      avatar: newProfileRole === 'kids' ? '🧒' : newProfileRole === 'teen' ? '🎧' : '👤',
      role: newProfileRole,
      maxAllowedRating: newProfileRating,
      isPinProtected: false,
      lockedCategoryIds: newProfileRole === 'kids' ? ['cat_adult', 'cat_xxx', 'cat_horror'] : ['cat_adult'],
      lockedChannelIds: ['ch_playboy'],
      dailyWatchTimeLimitMinutes: newProfileLimitMin,
      curfewStartHour: newProfileRole === 'kids' ? 20 : 22,
      curfewEndHour: 7,
      hideRestrictedItemsFromList: true,
    });

    setNewProfileName('');
    setShowAddProfile(false);
    refreshState();
  };

  const handleToggleHideRestricted = () => {
    const next = !vault.hideRestrictedChannels;
    globalParentalControlEngine.setHideRestrictedChannels(next);
    refreshState();
  };

  const channelBlockResult = globalParentalControlEngine.isChannelBlocked(
    'test_ch_001',
    testCategory,
    testChannelName
  );

  const programRatingResult = globalParentalControlEngine.isProgramRatingExceeded(testProgRating);

  return (
    <div id="parental-control-vault-surface" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Lock className="w-5 h-5 text-indigo-400" />
              Milestone 14: Enterprise Parental Control Vault, Multi-Profile PIN Locker &amp; Curfew Filter
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Salted PBKDF2/SHA-256 PIN hashing, rate-limited lockouts (5 failed attempts ➔ 60s cooldown), age-rating filters, and bedtimes.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleHideRestricted}
              className={`px-3 py-1 text-xs font-semibold rounded-full border transition-colors ${
                vault.hideRestrictedChannels
                  ? 'bg-rose-950 text-rose-300 border-rose-700'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              Restricted Channels: {vault.hideRestrictedChannels ? 'HIDDEN FROM LIST' : 'BLURRED WITH PIN PROMPT'}
            </button>
          </div>
        </div>
      </div>

      {/* Curfew Alert if active */}
      {curfewReport.isCurfewActive && (
        <div className="p-4 bg-amber-950/60 border border-amber-800 rounded-xl text-xs text-amber-200 flex items-center gap-3">
          <Clock className="w-5 h-5 text-amber-400 shrink-0" />
          <span>{curfewReport.message}</span>
        </div>
      )}

      {/* Active Profile Status Shelf */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {vault.profiles.map((prof) => (
          <div
            key={prof.id}
            onClick={() => handleSwitchProfile(prof.id)}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              prof.id === activeProfile.id
                ? 'bg-indigo-950/70 border-indigo-500 text-white ring-1 ring-indigo-500 shadow-md'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{prof.avatar}</span>
                <div>
                  <div className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                    {prof.name}
                    {prof.id === activeProfile.id && (
                      <span className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.2 rounded font-mono font-normal">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 capitalize">{prof.role.replace('_', ' ')}</div>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] space-y-1">
              <div className="flex justify-between">
                <span>Max Rating:</span>
                <span className="font-mono text-indigo-300 font-bold">{prof.maxAllowedRating}</span>
              </div>
              <div className="flex justify-between">
                <span>Daily Limit:</span>
                <span>{prof.dailyWatchTimeLimitMinutes > 0 ? `${prof.currentWatchTimeMinutesToday}/${prof.dailyWatchTimeLimitMinutes}m` : 'Unlimited'}</span>
              </div>
              {prof.curfewStartHour > 0 && (
                <div className="flex justify-between text-amber-400">
                  <span>Bedtime Curfew:</span>
                  <span>{prof.curfewStartHour}:00 - {prof.curfewEndHour}:00</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid: PIN Vault Authentication + Restriction Checker + Profile Creator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: PIN Vault Test & Rate-Limited Lockout Status */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-indigo-400" />
              Master PIN Vault Authentication
            </h3>
            <p className="text-xs text-slate-400">
              Default Master PIN: <code className="text-indigo-300 font-bold">1234</code> (Salted SHA-256 equivalent). 5 failed attempts locks vault for 60 seconds.
            </p>

            {vault.isLockedOut ? (
              <div className="p-4 bg-rose-950/70 border border-rose-800 rounded-lg text-xs text-rose-200 space-y-2">
                <div className="font-bold flex items-center gap-1.5 text-rose-400 text-sm">
                  <ShieldAlert className="w-4 h-4" /> Vault Security Lockout Active
                </div>
                <p>Too many incorrect PIN attempts. Vault is currently locked for {vault.lockoutRemainingSeconds} seconds.</p>
              </div>
            ) : (
              <form onSubmit={handleVerifyPin} className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Enter Master PIN:</label>
                  <input
                    type="password"
                    maxLength={6}
                    value={inputPin}
                    onChange={(e) => setInputPin(e.target.value)}
                    placeholder="••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-center text-lg tracking-widest text-slate-100 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="submit"
                    className="py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded transition-colors"
                  >
                    Verify PIN
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInputPin('9999');
                      const res = globalParentalControlEngine.verifyPin('9999');
                      setPinVerificationResult(res);
                      refreshState();
                    }}
                    className="py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded"
                  >
                    Inject Wrong PIN
                  </button>
                </div>
              </form>
            )}

            {pinVerificationResult && (
              <div
                className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                  pinVerificationResult.success
                    ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                    : 'bg-rose-950/60 border-rose-800 text-rose-300'
                }`}
              >
                {pinVerificationResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  {pinVerificationResult.success
                    ? 'Master PIN Verified! Temporary channel and bouquet unlock granted.'
                    : pinVerificationResult.errorReason || 'PIN Verification Failed.'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Middle Column: Live Channel & Rating Restriction Tester */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              Real-time Policy &amp; Content Access Tester
            </h3>
            <p className="text-xs text-slate-400">
              Evaluates channel, bouquet and program ratings against current active profile: <strong className="text-indigo-300">{activeProfile.name}</strong>.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Test Channel Name:</label>
                <select
                  value={testChannelName}
                  onChange={(e) => setTestChannelName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
                >
                  <option value="Playboy TV HD">Playboy TV HD (Adult)</option>
                  <option value="HBO Max Movies">HBO Max Movies</option>
                  <option value="Cartoon Network">Cartoon Network (Kids)</option>
                  <option value="Sky Sports F1 HD">Sky Sports F1 HD</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Program Age Rating:</label>
                <select
                  value={testProgRating}
                  onChange={(e) => setTestProgRating(e.target.value as AgeRating)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
                >
                  <option value="G">G (General Audience)</option>
                  <option value="PG">PG (Parental Guidance)</option>
                  <option value="PG-13">PG-13 (Teens)</option>
                  <option value="TV-MA">TV-MA (Mature Audience Only)</option>
                  <option value="R">R (Restricted)</option>
                  <option value="ADULT_18+">ADULT 18+ (Explicit)</option>
                </select>
              </div>
            </div>

            {/* Evaluation Results Box */}
            <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Channel Stream Access:</span>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                    channelBlockResult.isBlocked
                      ? 'bg-rose-950 text-rose-300 border border-rose-800'
                      : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  }`}
                >
                  {channelBlockResult.isBlocked ? 'BLOCKED / LOCKED' : 'ALLOWED (UNRESTRICTED)'}
                </span>
              </div>

              {channelBlockResult.reason && (
                <div className="text-[11px] text-rose-400 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> {channelBlockResult.reason}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <span className="text-slate-400">Program Age Rating Check:</span>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                    programRatingResult.isBlocked
                      ? 'bg-rose-950 text-rose-300 border border-rose-800'
                      : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  }`}
                >
                  {programRatingResult.isBlocked ? 'RATING EXCEEDED' : 'RATING ALLOWED'}
                </span>
              </div>

              {programRatingResult.reason && (
                <div className="text-[11px] text-amber-400">
                  {programRatingResult.reason}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Add Custom Profile */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              Create Managed Profile
            </h3>

            <form onSubmit={handleCreateProfile} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Profile Name:</label>
                <input
                  type="text"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  placeholder="e.g. Toddler Room"
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Role:</label>
                  <select
                    value={newProfileRole}
                    onChange={(e) => setNewProfileRole(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
                  >
                    <option value="kids">Kids</option>
                    <option value="teen">Teen</option>
                    <option value="guest">Guest</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Max Rating:</label>
                  <select
                    value={newProfileRating}
                    onChange={(e) => setNewProfileRating(e.target.value as AgeRating)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
                  >
                    <option value="G">G</option>
                    <option value="PG">PG</option>
                    <option value="PG-13">PG-13</option>
                    <option value="TV-MA">TV-MA</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Daily Watch Limit (min):</label>
                <input
                  type="number"
                  min="15"
                  max="480"
                  value={newProfileLimitMin}
                  onChange={(e) => setNewProfileLimitMin(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white rounded font-medium transition-colors"
              >
                Create Profile &amp; Apply Curfew
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
