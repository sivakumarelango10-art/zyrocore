import Header from '@/components/header'
import Footer from '@/components/footer'
import StorySection from '../story/story-section'

export const metadata = {
  title: 'Our Journey — ZYRØCORE',
  description: 'Built from Tamil Nadu. Built in Public. Discover the ZYRØCORE journey and our mission.',
}

export default function JourneyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <StorySection />
      </main>
      <Footer />
    </div>
  )
}
