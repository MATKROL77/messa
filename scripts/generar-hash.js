// Genera el hash bcrypt de una contraseña para pegar en tu .env
// Uso: node scripts/generar-hash.js "TuContraseñaSegura123"
const bcrypt = require('bcryptjs')
const password = process.argv[2]
if (!password) {
  console.log('Uso: node scripts/generar-hash.js "TuContraseña"')
  process.exit(1)
}
const hash = bcrypt.hashSync(password, 12)
console.log('\nPegá esto en tu .env:\n')
console.log(hash)
console.log('')
