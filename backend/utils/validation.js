const passwordValid = value => typeof value === 'string' && Buffer.byteLength(value, 'utf8') <= 72 && value.length > 8 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /[^a-zA-Z0-9\s]/.test(value)
const passwordMessage = 'Password must have 9+ characters, uppercase, lowercase and a special character (maximum 72 UTF-8 bytes)'
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }) }
const wrap = fn => (req, res, next) => Promise.resolve().then(() => fn(req, res, next)).catch(next)
const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
module.exports = { passwordValid, passwordMessage, fail, wrap, validDate }
