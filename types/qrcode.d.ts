// `qrcode` no publica tipos propios. Declaramos sólo la porción que usa MESSA
// (generar el PNG del QR de cada mesa en el navegador) para no perder el
// chequeo de tipos en esa llamada.
declare module 'qrcode' {
  export interface QRCodeToDataURLOptions {
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
    margin?: number
    scale?: number
    width?: number
    color?: { dark?: string; light?: string }
  }

  export function toDataURL(text: string, options?: QRCodeToDataURLOptions): Promise<string>

  const QRCode: { toDataURL: typeof toDataURL }
  export default QRCode
}
