export const metadata = {
  title: 'Alora Ops',
  description: 'Alora daily operations dashboard',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#F0F4F9' }}>
        {children}
      </body>
    </html>
  )
}
