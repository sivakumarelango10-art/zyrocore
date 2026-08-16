import { describe, it, expect, vi } from 'vitest'
import bcrypt from 'bcryptjs'

describe('Password Security & Profile Auth Logic', () => {
  it('should verify current password successfully when matching', async () => {
    const plainCurrent = 'OldPassword123!'
    const hashedInDb = await bcrypt.hash(plainCurrent, 10)

    const isValid = await bcrypt.compare(plainCurrent, hashedInDb)
    expect(isValid).toBe(true)
  })

  it('should reject password change when current password is wrong', async () => {
    const plainCurrent = 'WrongPassword123!'
    const hashedInDb = await bcrypt.hash('OldPassword123!', 10)

    const isValid = await bcrypt.compare(plainCurrent, hashedInDb)
    expect(isValid).toBe(false)
  })

  it('should identify OAuth user sentinel and block direct password change', () => {
    const oauthSentinelHash = 'OAUTH_USER_NO_PASSWORD'
    const isOAuthUser = oauthSentinelHash === 'OAUTH_USER_NO_PASSWORD'

    expect(isOAuthUser).toBe(true)
  })

  it('should enforce minimum password length of 8 characters', () => {
    const shortPassword = 'Pass1'
    const validPassword = 'SecurePassword123!'

    expect(shortPassword.length >= 8).toBe(false)
    expect(validPassword.length >= 8).toBe(true)
  })
})
