// Genera el hash bcrypt de una contraseña para pegar en tu .env
// Uso: node scripts/generar-hash.js "TuContraseñaSegura123"
async function main() {
  const { default: bcrypt } = await import('bcryptjs')
  const password = process.argv[2]
  if (!password) {
    console.log('Uso: node scripts/generar-hash.js "TuContraseña"')
    process.exitCode = 1
    return
  }
  const hash = bcrypt.hashSync(password, 12)
  console.log('\nPara tu archivo .env (con los "$" escapados, porque Next.js')
  console.log('expande variables dentro de los .env y si no el hash se rompe):\n')
  console.log(hash.replace(/\$/g, '\\$'))
  console.log('\nPara `wrangler secret put` o el panel de tu hosting (sin escapar):\n')
  console.log(hash)
  console.log('')
}

void main()
