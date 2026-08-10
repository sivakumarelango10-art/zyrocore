import Header from '@/components/header'
import Footer from '@/components/footer'
import HeroSection from './home/hero-section'
import BannerStrip from './home/banner-strip'

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <BannerStrip />
      </main>
      <Footer />
    </div>
  )
}
