import { useState, type FormEvent } from 'react'
import { ApiError } from '../lib/api'
import { useChangePassword, useSignOut, useUpdateProfile, type User } from '../lib/auth'
import { Avatar } from './Avatar'
import { Dialog } from './Modal'
import { Button, ErrorNote, Field, GuestBadge } from './ui'

export function Settings({ user, onClose }: { user: User; onClose: () => void }) {
  const { signOut } = useSignOut(user)

  return (
    <Dialog
      title="Account settings"
      onClose={onClose}
      className="max-w-lg"
      footer={
        <Button variant="danger" onClick={signOut}>
          Log out
        </Button>
      }
    >
      <div className="flex items-center gap-4">
        <Avatar user={user} size="lg" />
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-lg font-semibold text-white">
            <span className="truncate">{user.display_name}</span>
            {user.is_guest && <GuestBadge />}
          </p>
          <p className="text-sm text-zinc-400" data-testid="public-id">
            #{user.id}
          </p>
          {!user.is_guest && (
            <p className="mt-1 text-xs text-zinc-500">
              Your music goes in the <span className="font-mono text-zinc-300">Music/{user.id}</span> folder.
            </p>
          )}
        </div>
      </div>
      <DisplayNameForm user={user} />
      {!user.is_guest && <PasswordForm />}
    </Dialog>
  )
}

function DisplayNameForm({ user }: { user: User }) {
  const update = useUpdateProfile()
  const [name, setName] = useState(user.display_name)
  const error = update.error instanceof ApiError ? (update.error.field('display_name') ?? update.error.message) : undefined

  const submit = (event: FormEvent) => {
    event.preventDefault()
    update.mutate({ display_name: name })
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg bg-raised p-4">
      <Field label="Display name" value={name} onChange={(e) => setName(e.target.value)} maxLength={32} required error={error} hint="Shown on your playlists and, if you publish music, as the creator." />
      <div className="flex items-center justify-end gap-3">
        {update.isSuccess && name === user.display_name && <span className="text-sm text-accent">Saved</span>}
        <Button type="submit" disabled={update.isPending || name === user.display_name}>
          Save
        </Button>
      </div>
    </form>
  )
}

function PasswordForm() {
  const change = useChangePassword()
  const [form, setForm] = useState({ current_password: '', password: '', password_confirmation: '' })
  const error = change.error instanceof ApiError ? change.error : undefined

  const submit = (event: FormEvent) => {
    event.preventDefault()
    change.mutate(form, { onSuccess: () => setForm({ current_password: '', password: '', password_confirmation: '' }) })
  }

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value })

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg bg-raised p-4">
      <ErrorNote>{error && !error.field('current_password') && !error.field('password') ? error.message : undefined}</ErrorNote>
      <Field label="Current password" type="password" autoComplete="current-password" value={form.current_password} onChange={set('current_password')} required error={error?.field('current_password')} />
      <Field label="New password" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} minLength={8} required error={error?.field('password')} />
      <Field label="Confirm new password" type="password" autoComplete="new-password" value={form.password_confirmation} onChange={set('password_confirmation')} required />
      <div className="flex items-center justify-end gap-3">
        {change.isSuccess && <span className="text-sm text-accent">Password changed</span>}
        <Button type="submit" disabled={change.isPending}>
          Change password
        </Button>
      </div>
    </form>
  )
}
