import React, { useState, useEffect } from 'react';
import {
  Play,
  Plus,
  Lock,
  ShieldCheck,
  Check,
  X,
  Trash2,
  Edit2,
  Tv,
  Sparkles,
  Baby,
  User,
  LogOut,
} from 'lucide-react';
import { useProfile, UserProfile } from '../context/ProfileContext';

// Profile Avatars with custom SVG illustrations
export const ProfileAvatar: React.FC<{
  type: UserProfile['avatarType'];
  bgColor: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isKids?: boolean;
}> = ({ type, bgColor, size = 'lg', isKids }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-base',
    lg: 'w-24 h-24 text-3xl',
    xl: 'w-32 h-32 text-4xl',
  }[size];

  return (
    <div
      className={`${sizeClasses} rounded-full flex items-center justify-center font-bold text-white shadow-lg relative overflow-hidden transition-transform`}
      style={{ backgroundColor: bgColor }}
    >
      {/* Visual Avatar illustrations */}
      {type === 'avatar_man' && (
        <svg viewBox="0 0 100 100" className="w-4/5 h-4/5">
          {/* Stylized hair */}
          <path d="M25 40 Q50 15 75 40 Q50 30 25 40 Z" fill="#1e293b" />
          {/* Face */}
          <ellipse cx="50" cy="50" rx="28" ry="32" fill="#f97316" />
          {/* Eyes */}
          <circle cx="40" cy="48" r="3.5" fill="#0f172a" />
          <circle cx="60" cy="48" r="3.5" fill="#0f172a" />
          {/* Beard / Mustache */}
          <path d="M42 62 Q50 67 58 62" stroke="#451a03" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M38 68 Q50 78 62 68" stroke="#451a03" strokeWidth="4" fill="none" strokeLinecap="round" />
          {/* Neck / Shoulders */}
          <path d="M36 80 L36 100 L64 100 L64 80 Z" fill="#0284c7" />
        </svg>
      )}

      {type === 'avatar_boy' && (
        <svg viewBox="0 0 100 100" className="w-4/5 h-4/5">
          {/* Cheerful kid face with smile */}
          <ellipse cx="50" cy="48" rx="26" ry="28" fill="#fed7aa" />
          {/* Cap / Hair */}
          <path d="M22 40 Q50 10 78 40 Q50 25 22 40 Z" fill="#f59e0b" />
          <circle cx="39" cy="46" r="3" fill="#1e293b" />
          <circle cx="61" cy="46" r="3" fill="#1e293b" />
          {/* Big Smile */}
          <path d="M38 58 Q50 70 62 58" stroke="#b45309" strokeWidth="3" fill="#ef4444" strokeLinecap="round" />
          {/* Hoodie */}
          <path d="M28 78 Q50 85 72 78 L72 100 L28 100 Z" fill="#10b981" />
        </svg>
      )}

      {type === 'avatar_girl' && (
        <svg viewBox="0 0 100 100" className="w-4/5 h-4/5">
          {/* Pigtails / Hair */}
          <circle cx="20" cy="40" r="14" fill="#831843" />
          <circle cx="80" cy="40" r="14" fill="#831843" />
          <ellipse cx="50" cy="50" rx="27" ry="29" fill="#fbcfe8" />
          <circle cx="41" cy="47" r="3" fill="#1e293b" />
          <circle cx="59" cy="47" r="3" fill="#1e293b" />
          <path d="M42 60 Q50 68 58 60" stroke="#db2777" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M30 80 Q50 90 70 80 L70 100 L30 100 Z" fill="#ec4899" />
        </svg>
      )}

      {type === 'avatar_woman' && (
        <svg viewBox="0 0 100 100" className="w-4/5 h-4/5">
          <ellipse cx="50" cy="48" rx="25" ry="30" fill="#fde047" />
          <path d="M22 35 Q50 15 78 35 L78 60 Q50 50 22 60 Z" fill="#4c1d95" />
          <circle cx="41" cy="48" r="3" fill="#1e293b" />
          <circle cx="59" cy="48" r="3" fill="#1e293b" />
          <path d="M43 62 Q50 68 57 62" stroke="#be123c" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M32 80 L68 80 L68 100 L32 100 Z" fill="#7c3aed" />
        </svg>
      )}

      {type === 'avatar_robot' && (
        <svg viewBox="0 0 100 100" className="w-4/5 h-4/5">
          <rect x="26" y="28" width="48" height="42" rx="10" fill="#64748b" />
          <line x1="50" y1="28" x2="50" y2="15" stroke="#38bdf8" strokeWidth="4" />
          <circle cx="50" cy="14" r="5" fill="#38bdf8" />
          <rect x="34" y="40" width="10" height="10" rx="3" fill="#38bdf8" />
          <rect x="56" y="40" width="10" height="10" rx="3" fill="#38bdf8" />
          <rect x="38" y="56" width="24" height="6" rx="2" fill="#0f172a" />
          <path d="M28 72 L72 72 L72 100 L28 100 Z" fill="#475569" />
        </svg>
      )}

      {type === 'avatar_cat' && (
        <svg viewBox="0 0 100 100" className="w-4/5 h-4/5">
          {/* Ears */}
          <polygon points="25,40 38,18 45,35" fill="#f97316" />
          <polygon points="75,40 62,18 55,35" fill="#f97316" />
          <circle cx="50" cy="52" r="28" fill="#fb923c" />
          <circle cx="40" cy="48" r="4" fill="#0f172a" />
          <circle cx="60" cy="48" r="4" fill="#0f172a" />
          <polygon points="50,56 46,52 54,52" fill="#ef4444" />
          <path d="M44 60 Q50 64 56 60" stroke="#7c2d12" strokeWidth="2.5" fill="none" />
          {/* Whiskers */}
          <line x1="26" y1="52" x2="36" y2="54" stroke="#7c2d12" strokeWidth="2" />
          <line x1="26" y1="60" x2="36" y2="58" stroke="#7c2d12" strokeWidth="2" />
          <line x1="74" y1="52" x2="64" y2="54" stroke="#7c2d12" strokeWidth="2" />
          <line x1="74" y1="60" x2="64" y2="58" stroke="#7c2d12" strokeWidth="2" />
        </svg>
      )}

      {type === 'avatar_star' && (
        <svg viewBox="0 0 100 100" className="w-4/5 h-4/5">
          <polygon
            points="50,15 61,38 85,38 66,54 73,78 50,63 27,78 34,54 15,38 39,38"
            fill="#fbbf24"
            stroke="#d97706"
            strokeWidth="3"
          />
          <circle cx="43" cy="46" r="3" fill="#1e293b" />
          <circle cx="57" cy="46" r="3" fill="#1e293b" />
          <path d="M44 54 Q50 60 56 54" stroke="#b45309" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </svg>
      )}

      {/* Kids Corner Ribbon */}
      {isKids && (
        <span
          className="absolute -bottom-1 inset-x-0 bg-emerald-500/90 py-0.5 text-center text-[9px] uppercase tracking-wider font-extrabold"
          title="Kids Safe Profile"
        >
          Kids
        </span>
      )}
    </div>
  );
};

export const WhoIsWatchingScreen: React.FC = () => {
  const {
    profiles,
    currentProfile,
    autoContinue,
    selectProfile,
    createProfile,
    updateProfile,
    deleteProfile,
    toggleAutoContinue,
    closeWhoIsWatching,
  } = useProfile();

  // Screen modes & modals
  const [isManaging, setIsManaging] = useState<boolean>(false);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingProfile, setEditingProfile] = useState<UserProfile | null>(null);

  // Form states for Add / Edit
  const [formName, setFormName] = useState<string>('');
  const [formAvatarType, setFormAvatarType] = useState<UserProfile['avatarType']>('avatar_man');
  const [formBgColor, setFormBgColor] = useState<string>('#2563eb');
  const [formIsKids, setFormIsKids] = useState<boolean>(false);
  const [formPin, setFormPin] = useState<string>('');

  // PIN prompt modal state (when switching out of Kids or into a locked profile)
  const [pinPromptTarget, setPinPromptTarget] = useState<UserProfile | null>(null);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);

  const AVATAR_OPTIONS: { type: UserProfile['avatarType']; label: string; bg: string }[] = [
    { type: 'avatar_man', label: 'Adult Male', bg: '#2563eb' },
    { type: 'avatar_boy', label: 'Young Boy', bg: '#059669' },
    { type: 'avatar_girl', label: 'Young Girl', bg: '#db2777' },
    { type: 'avatar_woman', label: 'Adult Female', bg: '#7c3aed' },
    { type: 'avatar_robot', label: 'Cyber Bot', bg: '#475569' },
    { type: 'avatar_cat', label: 'Playful Kitty', bg: '#ea580c' },
    { type: 'avatar_star', label: 'Golden Star', bg: '#d97706' },
  ];

  const handleProfileClick = (profile: UserProfile) => {
    if (isManaging) {
      // Open edit modal for this profile
      setEditingProfile(profile);
      setFormName(profile.name);
      setFormAvatarType(profile.avatarType);
      setFormBgColor(profile.avatarBg);
      setFormIsKids(profile.isKids);
      setFormPin(profile.pin || '');
      setShowAddModal(true);
      return;
    }

    const result = selectProfile(profile.id);
    if (result.requiresPin) {
      setPinPromptTarget(profile);
      setPinInput('');
      setPinError(null);
    }
  };

  const handleConfirmPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinPromptTarget) return;

    const res = selectProfile(pinPromptTarget.id, pinInput);
    if (res.success) {
      setPinPromptTarget(null);
      setPinInput('');
      setPinError(null);
    } else {
      setPinError(res.error || 'Incorrect PIN. Default is 0000.');
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingProfile) {
      updateProfile(editingProfile.id, {
        name: formName.trim(),
        avatarType: formAvatarType,
        avatarBg: formBgColor,
        isKids: formIsKids,
        ratingLimit: formIsKids ? 'TV-PG' : 'ALL',
        pin: formPin.trim() || undefined,
      });
    } else {
      createProfile({
        name: formName.trim(),
        avatarType: formAvatarType,
        avatarBg: formBgColor,
        isKids: formIsKids,
        pin: formPin.trim() || undefined,
      });
    }

    setShowAddModal(false);
    setEditingProfile(null);
  };

  const openCreateModal = () => {
    setEditingProfile(null);
    setFormName('');
    setFormAvatarType('avatar_boy');
    setFormBgColor('#059669');
    setFormIsKids(true); // default new profile to kids option for convenience
    setFormPin('0000');
    setShowAddModal(true);
  };

  return (
    <div
      id="who-is-watching-screen"
      className="fixed inset-0 z-50 bg-[#080d1a] flex flex-col justify-between text-slate-100 p-6 md:p-12 overflow-hidden select-none"
      style={{
        backgroundImage: 'radial-gradient(ellipse 80% 80% at 50% -20%, rgba(37,99,235,0.18), rgba(8,13,26,0.98))',
      }}
    >
      {/* 1. Header with TvLok Brand & Sign Out (Matching Screenshot) */}
      <header className="flex items-center justify-between w-full max-w-7xl mx-auto">
        {/* TvLok Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 via-purple-500 to-sky-400 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <Play className="w-5 h-5 fill-white text-white translate-x-0.5" />
          </div>
          <span className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center">
            Tv<span className="text-cyan-400">Lok</span>
          </span>
        </div>

        {/* Top-Right Action: Sign Out or Close */}
        <div className="flex items-center gap-3">
          <button
            id="btn-sign-out"
            onClick={() => {
              // Sign out action resets session to default profile or locks
              closeWhoIsWatching();
            }}
            className="px-5 py-2 rounded-full border border-white/20 hover:border-white/50 text-sm font-semibold text-slate-200 hover:text-white bg-white/5 hover:bg-white/10 transition-all shadow-sm"
          >
            Enter App
          </button>
        </div>
      </header>

      {/* 2. Main Center Section: "Who is watching?" + Profiles Grid */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-5xl mx-auto w-full my-6">
        {/* Large Display Typography */}
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-2 text-center">
          Who is watching?
        </h1>
        <p className="text-slate-400 text-sm md:text-lg mb-10 text-center font-normal">
          {isManaging
            ? 'Select a profile to edit its settings, parental controls, or delete it.'
            : 'Choose a profile to start your session.'}
        </p>

        {/* Horizontal Profile Cards Row (Centered) */}
        <div className="flex items-center justify-center flex-wrap gap-6 md:gap-8">
          {profiles.map((p) => {
            const isSelected = p.id === currentProfile.id;
            return (
              <div
                key={p.id}
                id={`profile-card-${p.id}`}
                onClick={() => handleProfileClick(p)}
                className={`group relative flex flex-col items-center justify-center w-40 h-52 md:w-48 md:h-60 rounded-2xl cursor-pointer transition-all duration-200 transform hover:scale-105 ${
                  isSelected
                    ? 'bg-blue-900/30 border-2 border-blue-500 shadow-2xl shadow-blue-500/25'
                    : 'bg-[#121929]/70 hover:bg-[#182238] border border-white/10 hover:border-white/30 shadow-lg'
                }`}
              >
                {/* Edit Icon Overlay in Manage Mode */}
                {isManaging && (
                  <div className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-sky-500 text-white shadow-md">
                    <Edit2 className="w-3.5 h-3.5" />
                  </div>
                )}

                {/* Avatar */}
                <div className="relative mb-4">
                  <ProfileAvatar
                    type={p.avatarType}
                    bgColor={p.avatarBg}
                    size="lg"
                    isKids={p.isKids}
                  />

                  {/* Lock Indicator if PIN protected */}
                  {p.pin && !isManaging && (
                    <div className="absolute -top-1 -right-1 p-1 rounded-full bg-amber-500 text-slate-950 shadow-md">
                      <Lock className="w-3 h-3" />
                    </div>
                  )}
                </div>

                {/* Profile Name */}
                <span className="text-lg md:text-xl font-bold text-white group-hover:text-sky-300 transition-colors truncate max-w-[140px] text-center">
                  {p.name}
                </span>

                {/* Profile Badge Status (Matching reference photo: "Current profile") */}
                <div className="mt-1.5">
                  {isSelected ? (
                    <span className="text-xs font-semibold text-blue-400 flex items-center gap-1">
                      Current profile
                    </span>
                  ) : p.isKids ? (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      PG Content Only
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 group-hover:text-slate-300">
                      {isManaging ? 'Edit Profile' : 'Standard'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* "+ Add profile" Card (Matching reference photo) */}
          <div
            id="btn-add-profile"
            onClick={openCreateModal}
            className="group flex flex-col items-center justify-center w-40 h-52 md:w-48 md:h-60 rounded-2xl bg-[#121929]/50 hover:bg-[#182238] border border-white/10 hover:border-white/30 cursor-pointer transition-all duration-200 transform hover:scale-105"
          >
            <div className="w-24 h-24 rounded-full bg-slate-800/80 group-hover:bg-slate-700/80 border border-white/15 flex items-center justify-center text-slate-300 group-hover:text-white mb-4 transition-colors">
              <Plus className="w-9 h-9 stroke-[2.5]" />
            </div>
            <span className="text-base md:text-lg font-bold text-slate-300 group-hover:text-white transition-colors">
              Add profile
            </span>
          </div>
        </div>
      </main>

      {/* 3. Bottom Pill Controls (Matching Screenshot: "Manage profiles" & "Auto-continue: Off") */}
      <footer className="flex items-center justify-center gap-4 w-full max-w-7xl mx-auto pb-4">
        {/* Manage profiles button */}
        <button
          id="btn-manage-profiles"
          onClick={() => setIsManaging(!isManaging)}
          className={`px-6 py-2.5 rounded-full border text-sm font-semibold transition-all shadow-sm ${
            isManaging
              ? 'bg-sky-500 text-white border-sky-400 shadow-sky-500/30 font-bold'
              : 'border-white/20 hover:border-white/40 text-slate-300 hover:text-white bg-white/5 hover:bg-white/10'
          }`}
        >
          {isManaging ? 'Done Editing' : 'Manage profiles'}
        </button>

        {/* Auto-continue toggle button */}
        <button
          id="btn-auto-continue-toggle"
          onClick={toggleAutoContinue}
          className="px-6 py-2.5 rounded-full border border-white/20 hover:border-white/40 text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 text-sm font-semibold transition-all shadow-sm flex items-center gap-2"
        >
          <span>Auto-continue:</span>
          <span className={autoContinue ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
            {autoContinue ? 'On' : 'Off'}
          </span>
        </button>
      </footer>

      {/* 4. Add / Edit Profile Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-white/15 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {editingProfile ? 'Edit Profile' : 'Create New Profile'}
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Profile Preview Avatar */}
              <div className="flex justify-center my-2">
                <ProfileAvatar
                  type={formAvatarType}
                  bgColor={formBgColor}
                  size="xl"
                  isKids={formIsKids}
                />
              </div>

              {/* Profile Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Profile Name
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Mom, Lucas, Kids"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-sky-500 text-sm"
                  required
                />
              </div>

              {/* Avatar Type Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Choose Avatar Style
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {AVATAR_OPTIONS.map((opt) => (
                    <button
                      type="button"
                      key={opt.type}
                      onClick={() => {
                        setFormAvatarType(opt.type);
                        setFormBgColor(opt.bg);
                      }}
                      className={`p-2 rounded-xl flex flex-col items-center gap-1 border transition-all ${
                        formAvatarType === opt.type
                          ? 'border-sky-500 bg-sky-500/10'
                          : 'border-white/5 hover:border-white/20 bg-slate-900/50'
                      }`}
                    >
                      <ProfileAvatar type={opt.type} bgColor={opt.bg} size="sm" />
                      <span className="text-[10px] text-slate-300 truncate w-full text-center">
                        {opt.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Kids Profile Switch */}
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-emerald-500/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                    <Baby className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-1.5">
                      Kids Profile
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                        PG Rated Content Only
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">
                      Restricts channels and movies to family-friendly / PG rated content.
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setFormIsKids(!formIsKids)}
                  className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                    formIsKids ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      formIsKids ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Parental PIN */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Parental PIN (Optional 4-digits)
                </label>
                <input
                  type="password"
                  maxLength={4}
                  value={formPin}
                  onChange={(e) => setFormPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="0000"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white font-mono text-sm tracking-widest focus:outline-none focus:border-sky-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Required to switch from this profile or change restricted settings.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                {editingProfile && profiles.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Delete profile "${editingProfile.name}"?`)) {
                        deleteProfile(editingProfile.id);
                        setShowAddModal(false);
                      }
                    }}
                    className="px-3 py-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-xl text-slate-300 hover:text-white text-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-sm font-bold shadow-lg shadow-sky-500/30"
                  >
                    {editingProfile ? 'Save Changes' : 'Create Profile'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Parental PIN Prompt Modal (When switching out of Kids or into Locked Profile) */}
      {pinPromptTarget && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-white/15 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3">
              <Lock className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-bold text-white mb-1">Parental PIN Required</h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter the 4-digit parental control PIN to switch to{' '}
              <span className="text-white font-semibold">{pinPromptTarget.name}</span>.
              <br />
              (Default PIN is <code className="text-sky-400 font-mono">0000</code>)
            </p>

            <form onSubmit={handleConfirmPin}>
              <input
                type="password"
                maxLength={4}
                autoFocus
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value.replace(/\D/g, ''));
                  setPinError(null);
                }}
                placeholder="• • • •"
                className="w-40 mx-auto text-center px-4 py-3 rounded-2xl bg-slate-900 border border-white/20 text-2xl font-mono text-white tracking-[0.5em] focus:outline-none focus:border-sky-500 mb-3 block"
              />

              {pinError && (
                <p className="text-xs text-rose-400 mb-3 font-semibold">{pinError}</p>
              )}

              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPinPromptTarget(null);
                    setPinInput('');
                    setPinError(null);
                  }}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pinInput.length < 4}
                  className="px-6 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-sky-500/30"
                >
                  Confirm & Switch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
