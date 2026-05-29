const DAILY_SESSION_LIMIT = 5
const KEY = 'lt_usage'
const ADMIN_KEY = 'lt_admin'

function getTodayKey() {
  return new Date().toISOString().split('T')[0]
}

export function getUsage() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || '{}')
    const today = getTodayKey()
    const sessions = data[today]?.sessions || 0
    return {
      date: today,
      sessions,
      translations: data[today]?.translations || 0,
      remaining: DAILY_SESSION_LIMIT - sessions,
      limit: DAILY_SESSION_LIMIT,
    }
  } catch {
    return { sessions: 0, translations: 0, remaining: DAILY_SESSION_LIMIT, limit: DAILY_SESSION_LIMIT }
  }
}

export function incrementSession() {
  try {
    const today = getTodayKey()
    const data = JSON.parse(localStorage.getItem(KEY) || '{}')
    if (!data[today]) data[today] = { sessions: 0, translations: 0 }
    data[today].sessions += 1
    localStorage.setItem(KEY, JSON.stringify(data))
    return data[today].sessions
  } catch { return 0 }
}

export function incrementTranslation() {
  try {
    const today = getTodayKey()
    const data = JSON.parse(localStorage.getItem(KEY) || '{}')
    if (!data[today]) data[today] = { sessions: 0, translations: 0 }
    data[today].translations += 1
    localStorage.setItem(KEY, JSON.stringify(data))
    return data[today].translations
  } catch { return 0 }
}

export function isLimitReached() {
  // Kunlik sessiya cheklovi hozircha o'chirilgan — cheksiz foydalanish.
  // Qayta yoqish uchun quyidagi qatorlarni tiklang:
  //   if (isAdminMode()) return false
  //   const { sessions } = getUsage()
  //   return sessions >= DAILY_SESSION_LIMIT
  return false
}

export function resetUsage() {
  localStorage.removeItem(KEY)
}

export function isAdminMode() {
  return localStorage.getItem(ADMIN_KEY) === 'true'
}

export function setAdminMode(val) {
  if (val) localStorage.setItem(ADMIN_KEY, 'true')
  else localStorage.removeItem(ADMIN_KEY)
}
