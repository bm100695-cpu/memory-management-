import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { User, Mail, Phone, MapPin, Briefcase, Shield, Save, CheckCircle2 } from 'lucide-react';

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    fullName: '',
    phone: '',
    dateOfBirth: '',
    gender: 'prefer_not_to_say',
    address: {
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'India',
    },
    professional: {
      currentTitle: '',
      company: '',
      linkedinUrl: '',
      githubUrl: '',
      portfolioUrl: '',
    },
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/profile');
      if (res.data.data?.profile) {
        setProfile((prev) => ({
          ...prev,
          ...res.data.data.profile,
          address: { ...prev.address, ...(res.data.data.profile.address || {}) },
          professional: { ...prev.professional, ...(res.data.data.profile.professional || {}) },
        }));
      }
    } catch (err) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/profile', profile);
      toast.success('Profile saved securely!');
    } catch (err) {
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <User className="w-7 h-7 text-purple-400" />
            Personal Profile & Form Autofill
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Store your personal details once. Used by JARVIS and the Chrome Extension for 1-click form filling.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <Shield className="w-3.5 h-3.5" />
          Encrypted Locally
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="card">
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-purple-400" /> Basic Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="input-label">Full Name</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Rahul Sharma"
                value={profile.fullName}
                onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
              />
            </div>
            <div>
              <label className="input-label">Phone Number</label>
              <input
                type="tel"
                className="input"
                placeholder="+91 98765 43210"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="input-label">Date of Birth</label>
              <input
                type="date"
                className="input"
                value={profile.dateOfBirth ? profile.dateOfBirth.slice(0, 10) : ''}
                onChange={(e) => setProfile({ ...profile, dateOfBirth: e.target.value })}
              />
            </div>
            <div>
              <label className="input-label">Gender</label>
              <select
                className="input"
                value={profile.gender}
                onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="non_binary">Non-binary</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="card">
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-400" /> Address Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="input-label">Street Address</label>
              <input
                type="text"
                className="input"
                placeholder="Flat / House No, Street name"
                value={profile.address?.street || ''}
                onChange={(e) =>
                  setProfile({ ...profile, address: { ...profile.address, street: e.target.value } })
                }
              />
            </div>
            <div>
              <label className="input-label">City</label>
              <input
                type="text"
                className="input"
                placeholder="Mumbai / Delhi / Bengaluru"
                value={profile.address?.city || ''}
                onChange={(e) =>
                  setProfile({ ...profile, address: { ...profile.address, city: e.target.value } })
                }
              />
            </div>
            <div>
              <label className="input-label">State</label>
              <input
                type="text"
                className="input"
                placeholder="Maharashtra / Karnataka"
                value={profile.address?.state || ''}
                onChange={(e) =>
                  setProfile({ ...profile, address: { ...profile.address, state: e.target.value } })
                }
              />
            </div>
            <div>
              <label className="input-label">Postal / PIN Code</label>
              <input
                type="text"
                className="input"
                placeholder="400001"
                value={profile.address?.postalCode || ''}
                onChange={(e) =>
                  setProfile({ ...profile, address: { ...profile.address, postalCode: e.target.value } })
                }
              />
            </div>
            <div>
              <label className="input-label">Country</label>
              <input
                type="text"
                className="input"
                value={profile.address?.country || 'India'}
                onChange={(e) =>
                  setProfile({ ...profile, address: { ...profile.address, country: e.target.value } })
                }
              />
            </div>
          </div>
        </div>

        {/* Professional */}
        <div className="card">
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-emerald-400" /> Professional Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="input-label">Current Job Title</label>
              <input
                type="text"
                className="input"
                placeholder="Software Engineer / Product Manager"
                value={profile.professional?.currentTitle || ''}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    professional: { ...profile.professional, currentTitle: e.target.value },
                  })
                }
              />
            </div>
            <div>
              <label className="input-label">Company / Organization</label>
              <input
                type="text"
                className="input"
                placeholder="Acme Corp"
                value={profile.professional?.company || ''}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    professional: { ...profile.professional, company: e.target.value },
                  })
                }
              />
            </div>
            <div>
              <label className="input-label">LinkedIn URL</label>
              <input
                type="url"
                className="input"
                placeholder="https://linkedin.com/in/username"
                value={profile.professional?.linkedinUrl || ''}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    professional: { ...profile.professional, linkedinUrl: e.target.value },
                  })
                }
              />
            </div>
            <div>
              <label className="input-label">GitHub / Portfolio URL</label>
              <input
                type="url"
                className="input"
                placeholder="https://github.com/username"
                value={profile.professional?.githubUrl || ''}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    professional: { ...profile.professional, githubUrl: e.target.value },
                  })
                }
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save className="w-4 h-4" /> Save Profile
              </span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
