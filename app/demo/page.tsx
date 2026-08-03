import DemoEntrada from './entrada'

/**
 * Puerta del portfolio: `messa.app/demo`.
 *
 * Es el enlace que se pone en el portfolio. Abre una sesión de vitrina y
 * lleva al panel. Sin formulario, sin contraseña: quien llega desde un
 * portfolio no vino a registrarse, vino a mirar.
 */
export default function DemoPage() {
  return <DemoEntrada />
}
