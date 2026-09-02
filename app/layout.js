import './globals.css';

export const metadata = {
  title: 'Story Generator - Tales for Kids',
  description: 'AI-powered story generator for children',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="container">
          {children}
        </div>
      </body>
    </html>
  );
}
