'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import {
  User, Camera, Trash2, ShieldCheck, KeyRound, Save, CheckCircle2, XCircle, AlertCircle, Eye, EyeOff, Loader2, RefreshCw
} from 'lucide-react'
import AdminShell from '../admin-shell'
import { useAdminAuth } from '../admin-auth-provider'

export default function AdminProfilePage() {
  const { user: currentAuthUser, setUser: setAuthContextUser, refetch: refetchAuth } = useAdminAuth()

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<{
    id: number
    name: string
    email: string
    role: string
    avatar_url: string | null
    created_at?: string
  } | null>(null)

  // Name update states
  const [name, setName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [nameSuccess, setNameSuccess] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)

  // Avatar upload states
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [avatarSuccess, setAvatarSuccess] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Password update states
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [showCurrentPass, setShowCurrentPass] = useState(false)
  const [showNewPass, setShowNewPass] = useState(false)
  const [showConfirmPass, setShowConfirmPass] = useState(false)

  const [changingPassword, setChangingPassword] = useState(false)
  const [passSuccess, setPassSuccess] = useState<string | null>(null)
  const [passError, setPassError] = useState<string | null>(null)

  // Fetch initial admin profile details
  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true)
        const res = await fetch('/api/admin/profile')
        if (res.ok) {
          const data = await res.json()
          setProfile(data.user)
          setName(data.user.name || '')
          setAvatarUrl(data.user.avatar_url || null)
        } else {
          // Fallback to auth context if API fails
          if (currentAuthUser) {
            setProfile({
              id: currentAuthUser.id,
              name: currentAuthUser.name,
              email: currentAuthUser.email,
              role: currentAuthUser.role,
              avatar_url: currentAuthUser.avatar_url || null,
            })
            setName(currentAuthUser.name || '')
            setAvatarUrl(currentAuthUser.avatar_url || null)
          }
        }
      } catch {
        if (currentAuthUser) {
          setProfile({
            id: currentAuthUser.id,
            name: currentAuthUser.name,
            email: currentAuthUser.email,
            role: currentAuthUser.role,
            avatar_url: currentAuthUser.avatar_url || null,
          })
          setName(currentAuthUser.name || '')
          setAvatarUrl(currentAuthUser.avatar_url || null)
        }
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [currentAuthUser])

  // Image Upload Handler
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setAvatarError(null)
    setAvatarSuccess(null)

    // Image Type Validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setAvatarError('Invalid image type. Please select a JPG, PNG, or WEBP file.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    // Image Size Validation (Max 5MB)
    const MAX_SIZE_MB = 5
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setAvatarError(`Image size exceeds ${MAX_SIZE_MB}MB limit. Please choose a smaller file.`)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    try {
      setUploadingAvatar(true)
      const formData = new FormData()
      formData.append('file', file)

      // Upload image via consolidated storage helper endpoint
      const uploadRes = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      })

      const uploadData = await uploadRes.json()
      if (!uploadRes.ok) {
        throw new Error(uploadData.error || 'Failed to upload photo')
      }

      const newPhotoUrl = uploadData.url

      // Update profile with new avatar_url
      const updateRes = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_url: newPhotoUrl }),
      })

      const updateData = await updateRes.json()
      if (!updateRes.ok) {
        throw new Error(updateData.error || 'Failed to save avatar photo')
      }

      setAvatarUrl(newPhotoUrl)
      setAvatarSuccess('Profile photo updated successfully!')
      setAuthContextUser(prev => prev ? { ...prev, avatar_url: newPhotoUrl } : prev)
      refetchAuth()
    } catch (err: any) {
      setAvatarError(err?.message || 'Error uploading profile photo.')
    } finally {
      setUploadingAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Remove Photo Handler
  const handleRemovePhoto = async () => {
    if (!avatarUrl) return
    setAvatarError(null)
    setAvatarSuccess(null)

    try {
      setUploadingAvatar(true)
      const res = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_url: null }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to remove photo')
      }

      setAvatarUrl(null)
      setAvatarSuccess('Profile photo removed.')
      setAuthContextUser(prev => prev ? { ...prev, avatar_url: null } : prev)
      refetchAuth()
    } catch (err: any) {
      setAvatarError(err?.message || 'Error removing photo.')
    } finally {
      setUploadingAvatar(false)
    }
  }

  // Save Profile Name Handler
  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault()
    setNameError(null)
    setNameSuccess(null)

    if (!name.trim()) {
      setNameError('Name cannot be empty.')
      return
    }

    try {
      setSavingName(true)
      const res = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile name')
      }

      setNameSuccess('Profile name updated successfully!')
      setAuthContextUser(prev => prev ? { ...prev, name: name.trim() } : prev)
      refetchAuth()
    } catch (err: any) {
      setNameError(err?.message || 'Error updating name.')
    } finally {
      setSavingName(false)
    }
  }

  // Password Strength Validations
  const passChecks = {
    length: newPassword.length >= 8,
    upper: /[A-Z]/.test(newPassword),
    lower: /[a-z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    special: /[^A-Za-z0-9]/.test(newPassword),
  }
  const isPassValid = Object.values(passChecks).every(Boolean)
  const isMatch = newPassword === confirmPassword && confirmPassword.length > 0

  // Change Password Handler
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPassError(null)
    setPassSuccess(null)

    if (!currentPassword) {
      setPassError('Please enter your current password.')
      return
    }

    if (!isPassValid) {
      setPassError('Please ensure your new password satisfies all strength requirements.')
      return
    }

    if (!isMatch) {
      setPassError('New passwords do not match.')
      return
    }

    try {
      setChangingPassword(true)
      const res = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to change password')
      }

      setPassSuccess('Password changed successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setPassError(err?.message || 'Error updating password.')
    } finally {
      setChangingPassword(false)
    }
  }

  if (loading) {
    return (
      <AdminShell>
        <div className="p-6 flex items-center justify-center py-20">
          <div className="flex items-center gap-3 text-neutral-500 text-sm font-medium">
            <Loader2 className="w-5 h-5 animate-spin text-black" />
            Loading admin profile...
          </div>
        </div>
      </AdminShell>
    )
  }

  return (
    <AdminShell>
      <div className="p-6 max-w-4xl space-y-8 pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-neutral-500 uppercase mb-1">
          <ShieldCheck className="w-4 h-4 text-emerald-600" /> Secure Admin Control
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">Admin Profile & Settings</h1>
        <p className="text-sm text-neutral-500 mt-1">Manage your account information, profile photo, and password security.</p>
      </div>

      {/* Card 1: Avatar & Personal Details */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-700">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-900">Personal Information</h2>
              <p className="text-xs text-neutral-500">Update your photo and display name</p>
            </div>
          </div>
          <span className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-full border border-emerald-200 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Authenticated Admin
          </span>
        </div>

        <div className="p-6 space-y-6">
          {/* Avatar Upload Section */}
          <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-neutral-100">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full bg-neutral-900 flex items-center justify-center text-white text-3xl font-bold overflow-hidden border-2 border-neutral-200 shadow-inner">
                {avatarUrl ? (
                  <Image src={avatarUrl} alt={name || 'Admin'} width={96} height={96} unoptimized className="w-full h-full object-cover" />
                ) : (
                  name.charAt(0).toUpperCase() || 'A'
                )}
              </div>
              {uploadingAvatar && (
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center text-white">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              )}
            </div>

            <div className="flex-1 text-center sm:text-left space-y-2">
              <h3 className="text-sm font-semibold text-neutral-900">Profile Photo</h3>
              <p className="text-xs text-neutral-500 max-w-md">
                Upload a JPG, PNG, or WEBP image up to 5MB. Photo will be displayed on the admin sidebar and audit logs.
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="px-3.5 py-2 text-xs font-medium text-white bg-black hover:bg-neutral-800 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <Camera className="w-3.5 h-3.5" />
                  {uploadingAvatar ? 'Uploading...' : 'Upload Photo'}
                </button>

                {avatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    disabled={uploadingAvatar}
                    className="px-3.5 py-2 text-xs font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-1.5 border border-red-200 disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove
                  </button>
                )}
              </div>

              {avatarError && (
                <p className="text-xs font-medium text-red-600 flex items-center gap-1.5 pt-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {avatarError}
                </p>
              )}

              {avatarSuccess && (
                <p className="text-xs font-medium text-emerald-600 flex items-center gap-1.5 pt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {avatarSuccess}
                </p>
              )}
            </div>
          </div>

          {/* Name & Email Form */}
          <form onSubmit={handleSaveName} className="space-y-4">
            {nameSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                {nameSuccess}
              </div>
            )}

            {nameError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <XCircle className="w-4 h-4 flex-shrink-0" />
                {nameError}
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Admin Name"
                  required
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-black transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={profile?.email || ''}
                  disabled
                  className="w-full px-3.5 py-2.5 bg-neutral-100 border border-neutral-200 rounded-xl text-sm text-neutral-500 cursor-not-allowed"
                />
                <span className="text-[10px] text-neutral-400 mt-1 block">Email cannot be changed directly</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingName}
                className="px-4 py-2 text-xs font-semibold text-white bg-black hover:bg-neutral-800 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 shadow-sm"
              >
                {savingName ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Save Profile Name
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Card 2: Password Security */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-700">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-900">Security & Password</h2>
              <p className="text-xs text-neutral-500">Change your password with strict strength rules</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <form onSubmit={handleChangePassword} className="space-y-5">
            {passSuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                {passSuccess}
              </div>
            )}

            {passError && (
              <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <XCircle className="w-4 h-4 flex-shrink-0" />
                {passError}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full px-3.5 py-2.5 pr-10 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-black transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full px-3.5 py-2.5 pr-10 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-black transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full px-3.5 py-2.5 pr-10 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-black transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  >
                    {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && (
                  <p className={`text-[11px] font-medium mt-1 ${isMatch ? 'text-emerald-600' : 'text-red-500'}`}>
                    {isMatch ? '✓ Passwords match' : '✕ Passwords do not match'}
                  </p>
                )}
              </div>
            </div>

            {/* Live Password Strength meter */}
            {newPassword && (
              <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2">
                <p className="text-xs font-semibold text-neutral-700">Password Requirements:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div className={`flex items-center gap-1.5 ${passChecks.length ? 'text-emerald-600 font-medium' : 'text-neutral-400'}`}>
                    {passChecks.length ? <CheckCircle2 className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 border border-neutral-300 rounded-full" />}
                    At least 8 characters
                  </div>
                  <div className={`flex items-center gap-1.5 ${passChecks.upper ? 'text-emerald-600 font-medium' : 'text-neutral-400'}`}>
                    {passChecks.upper ? <CheckCircle2 className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 border border-neutral-300 rounded-full" />}
                    Uppercase letter (A-Z)
                  </div>
                  <div className={`flex items-center gap-1.5 ${passChecks.lower ? 'text-emerald-600 font-medium' : 'text-neutral-400'}`}>
                    {passChecks.lower ? <CheckCircle2 className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 border border-neutral-300 rounded-full" />}
                    Lowercase letter (a-z)
                  </div>
                  <div className={`flex items-center gap-1.5 ${passChecks.number ? 'text-emerald-600 font-medium' : 'text-neutral-400'}`}>
                    {passChecks.number ? <CheckCircle2 className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 border border-neutral-300 rounded-full" />}
                    Number (0-9)
                  </div>
                  <div className={`flex items-center gap-1.5 ${passChecks.special ? 'text-emerald-600 font-medium' : 'text-neutral-400'}`}>
                    {passChecks.special ? <CheckCircle2 className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 border border-neutral-300 rounded-full" />}
                    Special char (!@#$)
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={changingPassword || !isPassValid || !isMatch || !currentPassword}
                className="px-4 py-2 text-xs font-semibold text-white bg-black hover:bg-neutral-800 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 shadow-sm"
              >
                {changingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Updating Password...
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" /> Update Password
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </AdminShell>
  )
}
