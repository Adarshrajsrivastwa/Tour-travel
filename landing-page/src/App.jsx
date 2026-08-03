import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import {
  Menu,
  X,
  Phone,
  Mail,
  MapPin,
  Facebook,
  Twitter,
  Instagram,
  ShieldCheck,
  Scale,
  BarChart3,
  ChevronRight,
  Bus,
  Users,
  Clock,
  Star,
  HelpCircle,
  Sparkles,
  CheckCircle2,
  ChevronDown,
  MessageCircle,
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

const CONTACT = {
  phoneDisplay: '+91 8421449237',
  phoneTel: '+918421449237',
  phoneWhatsapp: '918421449237',
  email: 'grtourtravels2025@gmail.com',
  address: 'Village Parasda, Post Mason, District Ghazipur, U.P. Pincode 233231',
}

const UNSPLASH = 'https://images.unsplash.com'
const US_Q = 'ixlib=rb-4.0.3&auto=format&fit=crop'

const TRAVEL_HERO_BG = `${UNSPLASH}/photo-1544620347-c4fd4a3d5957?${US_Q}&w=1920&q=82`

const TRAVEL_GALLERY = [
  {
    src: `${UNSPLASH}/photo-1544620347-c4fd4a3d5957?${US_Q}&w=1000&q=82`,
    alt: 'Intercity coach at a terminal',
    caption: 'Fleet & departures',
  },
  {
    src: `${UNSPLASH}/photo-1524661135-423995f22d0b?${US_Q}&w=1000&q=82`,
    alt: 'Highway at dusk with light trails',
    caption: 'Highways & long routes',
  },
  {
    src: `${UNSPLASH}/photo-1506905925346-21bda4d32df4?${US_Q}&w=1000&q=82`,
    alt: 'Mountain peaks above the clouds',
    caption: 'Hill stations & tours',
  },
  {
    src: `${UNSPLASH}/photo-1507608616759-54f48f0af0ee?${US_Q}&w=1000&q=82`,
    alt: 'Travel planning with map and essentials',
    caption: 'Multi-mode travel desks',
  },
]

const TRAVEL_PARTNERSHIP_IMG = `${UNSPLASH}/photo-1544620347-c4fd4a3d5957?${US_Q}&w=1200&q=82`

const ScrollToTop = () => {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function useReveal(options = {}) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          obs.disconnect()
        }
      },
      { threshold: 0.06, rootMargin: '0px 0px 120px 0px', ...options }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return [ref, visible]
}

function Reveal({ children, className = '', delayClass = '', revealOptions = {} }) {
  const [ref, visible] = useReveal(revealOptions)
  return (
    <div
      ref={ref}
      className={`reveal-on-scroll ${delayClass} ${visible ? 'is-visible' : ''} ${className}`.trim()}
    >
      {children}
    </div>
  )
}

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <nav className="bg-white/95 backdrop-blur-sm shadow-lg sticky top-0 z-50 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center">
            <div className="p-1 rounded-lg w-12 h-12 mr-2">
              <img src="/logo.png" alt="GR Tour & Travel Logo" className="h-full w-full object-contain" />
            </div>
            <span className="text-2xl font-bold text-gray-900">GR Tour & Travel</span>
          </Link>

          <div className="hidden md:flex items-center gap-6 lg:gap-8">
            <Link to="/" className="text-gray-700 hover:text-blue-600 transition duration-300 font-medium">
              Home
            </Link>
            <a href="#features" className="text-gray-700 hover:text-blue-600 transition duration-300 font-medium">
              Features
            </a>
            <a href="#how-it-works" className="text-gray-700 hover:text-blue-600 transition duration-300 font-medium">
              How it works
            </a>
            <a href="#faq" className="text-gray-700 hover:text-blue-600 transition duration-300 font-medium">
              FAQ
            </a>
            <a href="#footer-policies" className="text-gray-700 hover:text-blue-600 transition duration-300 font-medium">
              Policies
            </a>
            <a href="#contact" className="text-gray-700 hover:text-blue-600 transition duration-300 font-medium">
              Contact
            </a>
            <Link to="/terms" className="text-gray-700 hover:text-blue-600 transition duration-300 font-medium">
              Terms
            </Link>
            <Link to="/refund" className="text-gray-700 hover:text-blue-600 transition duration-300 font-medium">
              Refunds
            </Link>
          </div>

          <div className="md:hidden">
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-600 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md p-1"
              aria-expanded={isOpen}
            >
              {isOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>
      {isOpen && (
        <div className="md:hidden bg-white border-t border-gray-200 p-4 space-y-1 flex flex-col shadow-md">
          <Link
            to="/"
            onClick={() => setIsOpen(false)}
            className="block text-gray-700 hover:text-blue-600 transition font-medium py-2"
          >
            Home
          </Link>
          <a href="#features" onClick={() => setIsOpen(false)} className="block text-gray-700 hover:text-blue-600 py-2 font-medium">
            Features
          </a>
          <a href="#how-it-works" onClick={() => setIsOpen(false)} className="block text-gray-700 hover:text-blue-600 py-2 font-medium">
            How it works
          </a>
          <a href="#faq" onClick={() => setIsOpen(false)} className="block text-gray-700 hover:text-blue-600 py-2 font-medium">
            FAQ
          </a>
          <a href="#footer-policies" onClick={() => setIsOpen(false)} className="block text-gray-700 hover:text-blue-600 py-2 font-medium">
            Policies
          </a>
          <a href="#contact" onClick={() => setIsOpen(false)} className="block text-gray-700 hover:text-blue-600 py-2 font-medium">
            Contact
          </a>
          <Link to="/terms" onClick={() => setIsOpen(false)} className="block text-gray-700 hover:text-blue-600 py-2 font-medium">
            Terms
          </Link>
          <Link to="/refund" onClick={() => setIsOpen(false)} className="block text-gray-700 hover:text-blue-600 py-2 font-medium">
            Refunds
          </Link>
        </div>
      )}
    </nav>
  )
}

const Footer = () => (
  <footer className="relative bg-slate-950 text-gray-400">
    <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-600" aria-hidden />
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-8">
      <div className="grid gap-12 md:gap-10 lg:grid-cols-3 lg:gap-12 lg:items-start">
        <div className="lg:pr-4">
          <Link to="/" className="inline-flex items-center gap-3 mb-5 group">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/10">
              <img src="/logo.png" alt="" className="h-9 w-9 object-contain" />
            </div>
            <span className="text-lg sm:text-xl font-bold text-white tracking-tight group-hover:text-blue-300 transition-colors">
              GR Tour &amp; Travel
            </span>
          </Link>
          <p className="text-sm leading-relaxed text-gray-400 max-w-xs">
            Bookings, fleet, and passenger communication in one place—for operators who need clarity at the counter and
            confidence at month-end.
          </p>
          <div className="mt-6 rounded-xl bg-white/[0.03] ring-1 ring-white/10 px-4 py-3 max-w-xs">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Business hours</p>
            <p className="text-sm text-gray-300 mt-1">Mon–Sat · 9:00 am – 7:00 pm IST</p>
          </div>
        </div>

        <div>
          <h4 className="text-white font-semibold text-xs uppercase tracking-[0.2em] mb-5">Explore</h4>
          <ul className="grid grid-cols-2 gap-x-8 gap-y-2.5 text-sm max-w-xs">
            <li>
              <Link to="/" className="text-gray-400 hover:text-white transition-colors">
                Home
              </Link>
            </li>
            <li>
              <a href="#features" className="text-gray-400 hover:text-white transition-colors">
                Features
              </a>
            </li>
            <li>
              <a href="#how-it-works" className="text-gray-400 hover:text-white transition-colors">
                How it works
              </a>
            </li>
            <li>
              <a href="#faq" className="text-gray-400 hover:text-white transition-colors">
                FAQ
              </a>
            </li>
            <li>
              <a href="#contact" className="text-gray-400 hover:text-white transition-colors">
                Contact
              </a>
            </li>
          </ul>
          <nav id="footer-policies" aria-label="Legal" className="scroll-mt-28 mt-8">
            <ul className="flex flex-col gap-y-2.5 text-sm text-gray-300">
              <li>
                <Link to="/terms" className="inline-block hover:text-white transition-colors">
                  Terms &amp; Conditions
                </Link>
              </li>
              <li>
                <Link to="/refund" className="inline-block hover:text-white transition-colors">
                  Refund &amp; cancellation
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="inline-block hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div>
          <h4 className="text-white font-semibold text-xs uppercase tracking-[0.2em] mb-5">Contact</h4>
          <ul className="space-y-3.5 text-sm">
            <li className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-blue-400 ring-1 ring-white/10 mt-0.5">
                <Phone size={16} strokeWidth={2} />
              </span>
              <a href={`tel:${CONTACT.phoneTel}`} className="text-gray-300 hover:text-white transition-colors pt-1">
                {CONTACT.phoneDisplay}
              </a>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-blue-400 ring-1 ring-white/10 mt-0.5">
                <Mail size={16} strokeWidth={2} />
              </span>
              <a href={`mailto:${CONTACT.email}`} className="text-gray-300 hover:text-white transition-colors pt-1 break-all">
                {CONTACT.email}
              </a>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-blue-400 ring-1 ring-white/10 mt-0.5">
                <MapPin size={16} strokeWidth={2} />
              </span>
              <span className="text-gray-300 pt-1 leading-snug">{CONTACT.address}</span>
            </li>
          </ul>
          <h4 className="text-white font-semibold text-xs uppercase tracking-[0.2em] mb-3 mt-8">Follow</h4>
          <div className="flex gap-2.5">
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-gray-400 ring-1 ring-white/10 hover:bg-blue-600 hover:text-white transition-colors"
              aria-label="Facebook"
            >
              <Facebook size={16} />
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-gray-400 ring-1 ring-white/10 hover:bg-sky-500 hover:text-white transition-colors"
              aria-label="Twitter"
            >
              <Twitter size={16} />
            </a>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-gray-400 ring-1 ring-white/10 hover:bg-pink-600 hover:text-white transition-colors"
              aria-label="Instagram"
            >
              <Instagram size={16} />
            </a>
          </div>
        </div>
      </div>

      <div className="mt-12 border-t border-white/10 pt-8 text-center">
        <p className="text-xs text-gray-500">
          &copy; {new Date().getFullYear()} GR Tour &amp; Travel. All rights reserved.
        </p>
      </div>
    </div>
  </footer>
)

const faqItems = [
  {
    q: 'Who is GR Tour & Travel for?',
    a: 'We work with tour operators, fleet owners, and travel desks that run scheduled routes, charters, or mixed services and need one place to manage trips, seats, and passenger communication.',
  },
  {
    q: 'How do bookings and payments work?',
    a: 'You can align bookings with your existing process—counter, partner agents, or online. Payment rules (advance, balance, refunds) follow the policies shown on your ticket or invoice and our Terms & Refund pages.',
  },
  {
    q: 'Can we onboard an existing route network?',
    a: 'Yes. Most teams start with a pilot route or branch, import master data (routes, fares, vehicles), then roll out in phases so staff training stays manageable.',
  },
  {
    q: 'What support do you provide?',
    a: 'We offer documentation, onboarding assistance, and business-hours support channels. Critical incidents are prioritized based on severity and impact.',
  },
  {
    q: 'Where are my data and backups stored?',
    a: 'We follow reasonable security practices described in our Privacy Policy. Exact hosting regions and retention depend on your plan—ask us for details before you go live.',
  },
]

function FaqAccordion() {
  const [open, setOpen] = useState(0)
  return (
    <div className="space-y-3 max-w-3xl mx-auto">
      {faqItems.map((item, i) => {
        const isOpen = open === i
        return (
          <div
            key={item.q}
            className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden transition-shadow hover:shadow-md"
          >
            <button
              type="button"
              onClick={() => setOpen(isOpen ? -1 : i)}
              className="w-full flex items-center justify-between gap-4 text-left px-6 py-4 font-semibold text-gray-800"
            >
              <span>{item.q}</span>
              <ChevronDown
                size={22}
                className={`text-blue-600 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
              />
            </button>
            <div
              className={`grid transition-[grid-template-rows] duration-300 ease-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
            >
              <div className="overflow-hidden">
                <p className="px-6 pb-5 text-gray-600 leading-relaxed text-sm md:text-base">{item.a}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

const LandingPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const { name, email, message } = formData
    const phoneNumber = CONTACT.phoneWhatsapp
    const text = `*New Inquiry from Website*%0A%0A*Name:* ${name}%0A*Email:* ${email}%0A*Message:* ${message}`
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${text}`
    window.open(whatsappUrl, '_blank')
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const featureCards = [
    {
      icon: Scale,
      title: 'Intuitive booking management',
      body: 'Capture seat maps, manifests, and changes in one flow—fewer spreadsheets, fewer double bookings, and a clear history for every passenger.',
    },
    {
      icon: ShieldCheck,
      title: 'Security you can stand behind',
      body: 'Role-based access, audit-friendly records, and practices aligned with how travel businesses actually operate day to day.',
    },
    {
      icon: BarChart3,
      title: 'Reports that drive decisions',
      body: 'Occupancy, revenue, route performance, and operational exceptions—export when finance asks, without rebuilding pivot tables.',
    },
    {
      icon: Bus,
      title: 'Fleet & trip visibility',
      body: 'Keep vehicles, drivers, and departures aligned so dispatch, counter staff, and management share the same live picture.',
    },
    {
      icon: Users,
      title: 'Passenger experience',
      body: 'Consistent confirmations, reminders, and support handoffs so customers know what to expect before they reach the boarding point.',
    },
    {
      icon: Clock,
      title: 'Faster daily operations',
      body: 'Templates for recurring routes, quick edits for disruptions, and workflows that reduce repetitive data entry during peak hours.',
    },
  ]

  const steps = [
    { title: 'Discovery call', body: 'We map your routes, roles, and reporting needs so rollout matches how your team already works.' },
    { title: 'Setup & migration', body: 'Import masters, configure fares and policies, and validate a pilot route before full go-live.' },
    { title: 'Team training', body: 'Short, practical sessions for counter, dispatch, and admin—with quick-reference material for new hires.' },
    { title: 'Go-live & tune', body: 'Monitor early trips together, adjust alerts and reports, and expand coverage as confidence grows.' },
  ]

  const testimonials = [
    {
      quote: 'We cut reconciliation time sharply once bookings, cash, and UPI entries lived in one system.',
      name: 'Operations lead',
      place: 'Regional bus operator',
    },
    {
      quote: 'Passenger complaints dropped when confirmations and seat info stopped getting lost in chats.',
      name: 'Branch manager',
      place: 'Tour & charter company',
    },
    {
      quote: 'Management finally sees load factors by route without waiting for end-of-week Excel dumps.',
      name: 'Finance controller',
      place: 'Intercity services',
    },
  ]

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <section className="relative text-white py-24 md:py-32 px-4 overflow-hidden bg-slate-900 min-h-[22rem] md:min-h-[26rem]">
        <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
          <img
            src={TRAVEL_HERO_BG}
            alt=""
            width={1920}
            height={1080}
            decoding="async"
            fetchPriority="high"
            referrerPolicy="no-referrer"
            className="h-full w-full min-h-[22rem] object-cover opacity-45 sm:opacity-50 md:opacity-55"
          />
          <div className="absolute inset-0 hero-gradient-overlay" />
        </div>
        <div className="pointer-events-none absolute -top-24 -right-24 z-[2] w-80 h-80 rounded-full bg-sky-400/25 blur-3xl animate-float-soft" />
        <div
          className="pointer-events-none absolute -bottom-32 -left-20 z-[2] w-96 h-96 rounded-full bg-indigo-500/20 blur-3xl animate-float-soft"
          style={{ animationDelay: '1.5s' }}
        />
        <div className="pointer-events-none absolute inset-0 z-[2] opacity-[0.12]">
          <div
            className="h-full w-full bg-repeat bg-center"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.35'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 0h-2v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-[12%] md:top-[16%] z-[3] h-24 overflow-visible" aria-hidden>
          <div className="travel-cloud travel-cloud-a" />
          <div className="travel-cloud travel-cloud-b" />
          <div className="travel-cloud travel-cloud-c" />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[4] h-36 sm:h-40 overflow-hidden">
          <div className="absolute inset-x-0 bottom-0 h-[4.5rem] bg-gradient-to-t from-slate-950/75 via-slate-900/45 to-transparent" />
          <div className="absolute bottom-0 left-0 w-24 h-[3.5rem] bg-gradient-to-r from-white/[0.07] to-transparent rounded-tr-lg" />
          <div className="absolute bottom-0 right-0 w-24 h-[3.5rem] bg-gradient-to-l from-white/[0.07] to-transparent rounded-tl-lg" />
          <div className="absolute inset-x-0 bottom-[3.25rem] h-px bg-white/15" />
          <div className="absolute inset-x-0 bottom-[2.85rem] h-[3px] travel-lane-markings" />
          <div className="travel-bus" aria-hidden>
            <div className="travel-bus-bob">
              <div className="relative">
                <span className="travel-bus-glow" />
                <Bus
                  size={52}
                  strokeWidth={2.35}
                  className="relative z-[1] text-amber-200 drop-shadow-[0_12px_24px_rgba(0,0,0,0.65)]"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto text-center relative z-20">
          <p className="animate-fade-in inline-flex items-center gap-2 text-sm md:text-base font-semibold uppercase tracking-wider text-blue-100/95 mb-6">
            <Sparkles size={18} className="text-amber-200 animate-sparkle-soft" />
            Built for real-world travel operations
          </p>
          <h1 className="animate-fade-in-up opacity-0 text-4xl sm:text-5xl md:text-7xl font-extrabold mb-6 leading-tight drop-shadow-lg">
            Manage your travels effortlessly
          </h1>
          <p className="animate-fade-in-up animate-delay-100 opacity-0 text-lg md:text-2xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
            One platform for bookings, fleet coordination, passenger communication, and the reporting your finance team
            keeps asking for—without turning your counter into a software project.
          </p>
        </div>
      </section>

      <section className="py-20 md:py-24 px-4 bg-white border-b border-gray-100" aria-label="Travel photography">
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-3 text-gray-800">Built for journeys like these</h2>
            <p className="text-center text-gray-600 max-w-2xl mx-auto leading-relaxed mb-12 md:mb-14">
              Coaches, charters, intercity routes, and busy counters—visual cues that match how your team actually works on
              the road.
            </p>
          </Reveal>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
            {TRAVEL_GALLERY.map((item, i) => (
              <Reveal
                key={item.alt}
                delayClass={i === 1 ? 'delay-100' : i === 2 ? 'delay-200' : i === 3 ? 'delay-300' : ''}
                revealOptions={{ threshold: 0.02, rootMargin: '0px 0px 200px 0px' }}
              >
                <figure className="group relative aspect-[4/3] overflow-hidden rounded-2xl ring-1 ring-black/[0.06] shadow-md hover:shadow-xl transition-shadow duration-300 bg-slate-200">
                  <img
                    src={item.src}
                    alt={item.alt}
                    width={1000}
                    height={750}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className="travel-gallery-img relative z-[1] h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                  <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent px-3 pb-3 pt-10 sm:px-4 sm:pb-4 sm:pt-12">
                    <span className="text-xs sm:text-sm font-semibold text-white drop-shadow-sm">{item.caption}</span>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="py-24 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-gray-800">
              Everything your desk needs in one place
            </h2>
            <p className="text-center text-gray-600 max-w-2xl mx-auto mb-16 leading-relaxed">
              From morning departures to month-end numbers, GR Tour & Travel focuses on workflows operators use every
              day—not generic software bolted onto travel.
            </p>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {featureCards.map((f, i) => (
              <Reveal key={f.title} delayClass={i % 3 === 1 ? 'delay-100' : i % 3 === 2 ? 'delay-200' : ''}>
                <div className="h-full p-8 rounded-2xl bg-white shadow-lg hover:shadow-2xl transition duration-300 border border-gray-100 hover:-translate-y-1">
                  <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                    <f.icon size={30} />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-gray-800">{f.title}</h3>
                  <p className="text-gray-600 leading-relaxed text-sm md:text-base">{f.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-4 bg-white">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-14 items-center">
          <Reveal>
            <p className="text-blue-600 font-semibold text-sm uppercase tracking-wide mb-3">Why teams choose us</p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6">Operational clarity, not feature overload</h2>
            <p className="text-gray-600 leading-relaxed mb-8">
              Travel businesses win on reliability: correct seat, correct fare, correct departure time. We design around
              those moments—so your staff spends less time fighting tools and more time serving passengers.
            </p>
            <ul className="space-y-4">
              {[
                'Practical defaults for Indian intercity and charter patterns',
                'Clear ownership: who can change fares, void tickets, or issue refunds',
                'Room to grow from a single branch to a multi-city network',
              ].map((line) => (
                <li key={line} className="flex gap-3 text-gray-700">
                  <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={22} />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delayClass="delay-200">
            <div className="rounded-3xl overflow-hidden shadow-2xl ring-1 ring-slate-200/80 bg-slate-900">
              <div className="relative h-52 sm:h-56 md:h-64">
                <img
                  src={TRAVEL_PARTNERSHIP_IMG}
                  alt="Tour bus on a scenic road"
                  width={1200}
                  height={800}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover opacity-100"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-blue-950/95 via-blue-900/25 to-transparent" />
                <p className="absolute bottom-4 left-5 right-5 text-sm font-medium text-white/95 drop-shadow-md">
                  Your routes, your fleet—one calm system behind the counter.
                </p>
              </div>
              <div className="bg-gradient-to-br from-blue-600 to-indigo-800 p-8 sm:p-10 text-white">
                <h3 className="text-2xl font-bold mb-4">A partnership, not a one-off sale</h3>
                <p className="text-blue-100 leading-relaxed mb-6">
                  We expect your network to evolve—seasonal demand, new permits, revised routes. Your success criteria become
                  ours during onboarding and the first weeks after go-live.
                </p>
                <div className="flex flex-wrap gap-3">
                  <span className="px-4 py-2 rounded-full bg-white/15 text-sm font-medium">Onboarding playbook</span>
                  <span className="px-4 py-2 rounded-full bg-white/15 text-sm font-medium">Training sessions</span>
                  <span className="px-4 py-2 rounded-full bg-white/15 text-sm font-medium">Go-live support</span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="how-it-works" className="py-24 px-4 bg-gray-50 border-y border-gray-200">
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-gray-800">How onboarding works</h2>
            <p className="text-center text-gray-600 max-w-2xl mx-auto mb-16">
              A structured rollout keeps your counters running while we bring data, users, and reporting online.
            </p>
          </Reveal>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, i) => (
              <Reveal key={step.title} delayClass={i === 1 ? 'delay-100' : i === 2 ? 'delay-200' : i === 3 ? 'delay-300' : ''}>
                <div className="relative h-full p-8 rounded-2xl bg-white border border-gray-100 shadow-md hover:shadow-xl transition duration-300">
                  <span className="absolute -top-3 -left-3 w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-lg">
                    {i + 1}
                  </span>
                  <h3 className="text-lg font-bold text-gray-800 mb-3 pt-2">{step.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{step.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="flex items-center justify-center gap-2 mb-4">
              <Star className="text-amber-400 fill-amber-400" size={28} />
              <h2 className="text-3xl md:text-4xl font-bold text-gray-800 text-center">What operators say</h2>
            </div>
            <p className="text-center text-gray-600 max-w-2xl mx-auto mb-14">
              Quotes reflect typical outcomes; your timelines depend on fleet size, data quality, and training attendance.
            </p>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <Reveal key={t.name} delayClass={i === 1 ? 'delay-100' : i === 2 ? 'delay-200' : ''}>
                <blockquote className="h-full p-8 rounded-2xl bg-gray-50 border border-gray-100 shadow-sm hover:shadow-md transition duration-300">
                  <p className="text-gray-700 leading-relaxed mb-6">&ldquo;{t.quote}&rdquo;</p>
                  <footer className="text-sm">
                    <cite className="not-italic font-semibold text-gray-900">{t.name}</cite>
                    <p className="text-gray-500">{t.place}</p>
                  </footer>
                </blockquote>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="py-24 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <div className="flex items-center justify-center gap-2 mb-4">
              <HelpCircle className="text-blue-600" size={30} />
              <h2 className="text-3xl md:text-4xl font-bold text-gray-800 text-center">Frequently asked questions</h2>
            </div>
            <p className="text-center text-gray-600 mb-12">
              Straight answers about fit, rollout, and policies. For legal detail, see Terms, Privacy, and Refund pages.
            </p>
          </Reveal>
          <Reveal delayClass="delay-100">
            <FaqAccordion />
          </Reveal>
        </div>
      </section>

      <section id="contact" className="py-20 px-4 sm:px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <p className="text-center text-sm font-semibold uppercase tracking-wider text-blue-600 mb-2">Contact</p>
            <h2 className="text-center text-3xl md:text-4xl font-bold text-gray-900 mb-4">We&apos;re here to help</h2>
            <p className="text-center text-gray-600 max-w-2xl mx-auto mb-12 leading-relaxed">
              Share a few details and we&apos;ll open WhatsApp with your message ready—quick for busy counters and dispatch
              teams.
            </p>
          </Reveal>
          <div className="rounded-3xl bg-white shadow-[0_25px_60px_-15px_rgba(15,23,42,0.15)] overflow-hidden flex flex-col md:flex-row ring-1 ring-slate-200/80">
            <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 p-10 md:p-12 text-white md:w-[38%] flex flex-col justify-center min-h-[280px] md:min-h-0">
              <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(circle_at_30%_20%,white,transparent_55%)]" />
              <div className="relative">
                <h3 className="text-2xl md:text-3xl font-bold mb-4">Get in touch</h3>
                <p className="text-blue-100/95 text-sm md:text-base leading-relaxed mb-10">
                  Prefer WhatsApp? Send the form and we&apos;ll open a chat with your details prefilled—fast for busy
                  counters.
                </p>
                <ul className="space-y-5 text-sm md:text-base">
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/20">
                      <Phone size={18} />
                    </span>
                    <a href={`tel:${CONTACT.phoneTel}`} className="pt-1 text-white/95 hover:underline">
                      {CONTACT.phoneDisplay}
                    </a>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/20">
                      <Mail size={18} />
                    </span>
                    <a href={`mailto:${CONTACT.email}`} className="pt-1 text-white/95 break-all hover:underline">
                      {CONTACT.email}
                    </a>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/20">
                      <MapPin size={18} />
                    </span>
                    <span className="pt-1 text-white/95 leading-snug">{CONTACT.address}</span>
                  </li>
                  <li className="flex items-start gap-3 pt-2 border-t border-white/15">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/30 ring-1 ring-emerald-400/40">
                      <MessageCircle size={18} className="text-emerald-100" />
                    </span>
                    <span className="pt-1 text-emerald-50/95 text-sm">Replies typically same business day</span>
                  </li>
                </ul>
              </div>
            </div>
            <div className="p-10 md:p-12 md:w-[62%] bg-slate-50/80">
              <h3 className="text-2xl md:text-3xl font-bold mb-2 text-gray-900">Send us a message</h3>
              <p className="text-gray-500 text-sm mb-8">Fields marked below are required before we open WhatsApp.</p>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="contact-name" className="sr-only">
                    Your name
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Your name"
                    required
                    autoComplete="name"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-gray-900 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label htmlFor="contact-email" className="sr-only">
                    Your email
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Your email"
                    required
                    autoComplete="email"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-gray-900 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label htmlFor="contact-message" className="sr-only">
                    Your message
                  </label>
                  <textarea
                    id="contact-message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Routes, fleet size, or questions about terms & refunds"
                    required
                    rows={5}
                    className="w-full resize-y min-h-[140px] rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-gray-900 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-blue-600 px-6 py-4 text-base font-bold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/30"
                >
                  Send message via WhatsApp
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

const PolicySection = ({ n, title, children }) => (
  <section className="group border-t first:border-t-0 first:pt-0 pt-10 first:mt-0 mt-0 border-gray-100">
    <div className="flex items-center gap-3 mb-4">
      <span className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full text-sm font-bold shrink-0">
        {n}
      </span>
      <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
    </div>
    <div className="text-gray-600 leading-relaxed ml-0 md:ml-11 space-y-3">{children}</div>
  </section>
)

const Terms = () => (
  <div className="min-h-screen flex flex-col bg-gray-50">
    <Navbar />
    <header className="bg-blue-600 py-16 text-white text-center">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Terms &amp; Conditions</h1>
        <p className="text-blue-100 text-lg">Rules for using GR Tour &amp; Travel services and platforms.</p>
        <p className="text-blue-200/90 text-sm mt-4">Last updated: April 12, 2026</p>
      </div>
    </header>
    <main className="flex-grow max-w-4xl mx-auto px-4 py-16 w-full">
      <div className="bg-white shadow-xl rounded-3xl p-8 md:p-12 space-y-2">
        <p className="text-gray-600 leading-relaxed mb-8 pb-8 border-b border-gray-100">
          These Terms govern access to our websites, apps, and related travel-management services. By registering,
          booking, or continuing to use the service, you agree to these Terms and to our{' '}
          <Link to="/privacy" className="text-blue-600 font-medium hover:underline">
            Privacy Policy
          </Link>
          . Cancellation and refund mechanics are described in our{' '}
          <Link to="/refund" className="text-blue-600 font-medium hover:underline">
            Refund &amp; Cancellation Policy
          </Link>
          .
        </p>
        <PolicySection n={1} title="Definitions">
          <p>
            <strong className="text-gray-800">&ldquo;We / us&rdquo;</strong> means GR Tour &amp; Travel and its authorized
            partners. <strong className="text-gray-800">&ldquo;You&rdquo;</strong> means the business account owner,
            staff users, and end passengers where applicable. <strong className="text-gray-800">&ldquo;Service&rdquo;</strong>{' '}
            includes software, support, documentation, and optional integrations we provide.
          </p>
        </PolicySection>
        <PolicySection n={2} title="Eligibility &amp; accounts">
          <p>
            You must have authority to bind your organization. You are responsible for user credentials, permission
            levels, and any activity under your account. Notify us promptly of unauthorized use.
          </p>
        </PolicySection>
        <PolicySection n={3} title="Bookings, fares &amp; tickets">
          <p>
            Fares, taxes, fees, and seat availability are determined by the operating company and applicable law. You are
            responsible for displaying accurate schedules and conditions to passengers. Tickets may be subject to carrier
            rules, permit conditions, and peak/off-peak pricing.
          </p>
        </PolicySection>
        <PolicySection n={4} title="Payments">
          <p>
            Invoices, advances, and settlement cycles depend on your commercial agreement. Late payments may result in
            suspension of non-critical features after notice. You remain responsible for charges incurred before
            suspension.
          </p>
        </PolicySection>
        <PolicySection n={5} title="Acceptable use">
          <p>You agree not to misuse the Service—including attempting to bypass security, scrape data without consent, send
            unlawful content, or overload infrastructure. We may investigate and suspend access for credible abuse
            reports.</p>
        </PolicySection>
        <PolicySection n={6} title="Intellectual property">
          <p>
            We retain rights to the Service, branding, and documentation. You retain rights to your business data. During
            your subscription, we grant a limited, non-exclusive license to use the Service for your internal travel
            operations.
          </p>
        </PolicySection>
        <PolicySection n={7} title="Third-party services">
          <p>
            Integrations (payments, SMS, maps, accounting) may be provided by third parties. Their terms and availability
            can change; we are not responsible for third-party outages beyond reasonable coordination efforts.
          </p>
        </PolicySection>
        <PolicySection n={8} title="Disclaimer &amp; limitation of liability">
          <p>
            The Service is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis to the extent permitted
            by law. We are not liable for indirect, incidental, special, consequential, or punitive damages, or loss of
            profits, goodwill, or data, except where liability cannot be excluded by law.
          </p>
        </PolicySection>
        <PolicySection n={9} title="Indemnity">
          <p>
            You will defend and indemnify us against third-party claims arising from your content, your passenger
            communications, or your breach of these Terms—subject to reasonable cooperation and notice.
          </p>
        </PolicySection>
        <PolicySection n={10} title="Suspension &amp; termination">
          <p>
            Either party may terminate for material breach if uncured after written notice where cure is reasonable. We may
            suspend access immediately for security incidents, legal requests, or severe operational risk. Export and
            transition assistance may be available as described in your order form.
          </p>
        </PolicySection>
        <PolicySection n={11} title="Governing law &amp; disputes">
          <p>
            These Terms are governed by the laws of India, without regard to conflict-of-law rules. Courts at our
            principal place of business shall have exclusive jurisdiction, subject to mandatory consumer protections
            where applicable.
          </p>
        </PolicySection>
        <PolicySection n={12} title="Changes">
          <p>
            We may update these Terms for legal, security, or product reasons. We will post the new date at the top and,
            where changes are material, provide reasonable notice via email or in-product message.
          </p>
        </PolicySection>
        <PolicySection n={13} title="Contact">
          <p>
            Questions about these Terms:{' '}
            <a href={`mailto:${CONTACT.email}`} className="text-blue-600 font-medium hover:underline">
              {CONTACT.email}
            </a>{' '}
            or {CONTACT.phoneDisplay}.
          </p>
        </PolicySection>
      </div>
    </main>
    <Footer />
  </div>
)

const Refund = () => (
  <div className="min-h-screen flex flex-col bg-gray-50">
    <Navbar />
    <header className="bg-blue-600 py-16 text-white text-center">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Refund &amp; Cancellation Policy</h1>
        <p className="text-blue-100 text-lg">How cancellations, credits, and refunds are handled.</p>
        <p className="text-blue-200/90 text-sm mt-4">Last updated: April 12, 2026</p>
      </div>
    </header>
    <main className="flex-grow max-w-4xl mx-auto px-4 py-16 w-full">
      <div className="bg-white shadow-xl rounded-3xl p-8 md:p-12 space-y-2">
        <p className="text-gray-600 leading-relaxed mb-8 pb-8 border-b border-gray-100">
          This policy works together with your ticket or invoice terms and our{' '}
          <Link to="/terms" className="text-blue-600 font-medium hover:underline">
            Terms &amp; Conditions
          </Link>
          . If there is a conflict for a specific journey, the fare rule printed or emailed on the ticket prevails.
        </p>
        <PolicySection n={1} title="Who can cancel">
          <p>
            Cancellations may be initiated by the passenger, the booking channel (counter/agent/online), or the operator
            for operational reasons (e.g., trip voided, consolidation, force majeure). The initiating party determines
            which refund path applies.
          </p>
        </PolicySection>
        <PolicySection n={2} title="Passenger-initiated cancellation">
          <p>
            Refund eligibility and fees depend on how early you cancel relative to departure, the fare type (flexible vs.
            restricted), and seat class. Partial refunds may be issued as a balance after a cancellation fee. Some
            promotional fares may be non-refundable except where law requires otherwise.
          </p>
        </PolicySection>
        <PolicySection n={3} title="Operator-initiated cancellation">
          <p>
            If we cancel a service, you will typically receive a full refund or an equivalent alternative seat on the next
            available service at no extra charge, at your option where feasible. If neither is possible, a refund will be
            processed to the original payment method or as account credit, based on what the payment rail supports.
          </p>
        </PolicySection>
        <PolicySection n={4} title="No-shows &amp; late arrival">
          <p>
            Passengers who do not board without prior cancellation are generally treated as no-shows. No-show tickets may
            be forfeited or partially refunded according to the published fare rule. Boarding gates close as per schedule;
            lateness may be treated as a no-show.
          </p>
        </PolicySection>
        <PolicySection n={5} title="Rescheduling">
          <p>
            Rescheduling may be allowed once (or as per fare rule) subject to seat availability and any fare difference or
            service fee. Rescheduled tickets assume the cancellation policy of the new departure time unless stated
            otherwise.
          </p>
        </PolicySection>
        <PolicySection n={6} title="Processing time">
          <p>
            Approved refunds are usually initiated within 7–14 business days after approval. Banks and wallets may take
            additional time to post credits. UPI/card timelines depend on issuer networks; we do not control posting
            delays.
          </p>
        </PolicySection>
        <PolicySection n={7} title="Chargebacks &amp; disputes">
          <p>
            If you file a chargeback, we may pause related refunds until the dispute is resolved. Provide booking ID,
            payment proof, and correspondence to help us reconcile quickly.
          </p>
        </PolicySection>
        <PolicySection n={8} title="Insurance &amp; add-ons">
          <p>
            Third-party travel insurance or add-on products may follow separate cancellation windows. Those refunds are
            governed by the add-on provider&apos;s policy.
          </p>
        </PolicySection>
        <PolicySection n={9} title="Contact">
          <p>
            For refund status: share PNR/booking ID with{' '}
            <a href={`mailto:${CONTACT.email}`} className="text-blue-600 font-medium hover:underline">
              {CONTACT.email}
            </a>{' '}
            or call {CONTACT.phoneDisplay} during business hours.
          </p>
        </PolicySection>
      </div>
    </main>
    <Footer />
  </div>
)

const Privacy = () => (
  <div className="min-h-screen flex flex-col bg-gray-50">
    <Navbar />
    <header className="bg-blue-600 py-16 text-white text-center">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Privacy Policy</h1>
        <p className="text-blue-100 text-lg">How we handle and protect your personal information.</p>
        <p className="text-blue-200/90 text-sm mt-4">Last updated: April 12, 2026</p>
      </div>
    </header>
    <main className="flex-grow max-w-4xl mx-auto px-4 py-16 w-full">
      <div className="bg-white shadow-xl rounded-3xl p-8 md:p-12 space-y-10">
        <p className="text-xl text-gray-700 italic border-l-4 border-blue-600 pl-4 font-medium">
          Your privacy matters. This policy explains what we collect, why we collect it, and the choices available to you.
        </p>
        <section className="group">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <ChevronRight className="text-blue-600" /> Information we collect
          </h2>
          <p className="text-gray-600 leading-relaxed ml-8">
            We collect information you provide when you register, book travel, complete forms, or contact us—such as name,
            email, phone, government ID details where legally required for travel, payment references (not full card data
            when processed by a payment partner), and trip preferences.
          </p>
        </section>
        <section className="group border-t pt-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <ChevronRight className="text-blue-600" /> How we use information
          </h2>
          <p className="text-gray-600 leading-relaxed ml-8">
            We use data to provide and improve the Service, authenticate users, process bookings, send service messages
            (schedules, delays, receipts), comply with law, detect fraud, and analyze product usage in aggregated form.
          </p>
        </section>
        <section className="group border-t pt-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <ChevronRight className="text-blue-600" /> Sharing
          </h2>
          <p className="text-gray-600 leading-relaxed ml-8">
            We may share information with payment processors, SMS/email providers, cloud hosting vendors, and authorities
            when required. We do not sell personal information. Contractors are bound by confidentiality and data-processing
            obligations appropriate to their role.
          </p>
        </section>
        <section className="group border-t pt-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <ChevronRight className="text-blue-600" /> Retention
          </h2>
          <p className="text-gray-600 leading-relaxed ml-8">
            We retain information as long as needed to provide the Service, meet legal/tax/booking record requirements,
            and resolve disputes. Retention schedules may vary by data category and jurisdiction.
          </p>
        </section>
        <section className="group border-t pt-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <ChevronRight className="text-blue-600" /> Security
          </h2>
          <p className="text-gray-600 leading-relaxed ml-8">
            We implement administrative, technical, and organizational measures designed to protect personal data. No method
            of transmission or storage is completely secure; please use strong passwords and protect your devices.
          </p>
        </section>
        <section className="group border-t pt-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <ChevronRight className="text-blue-600" /> Your choices
          </h2>
          <p className="text-gray-600 leading-relaxed ml-8">
            You may request access, correction, or deletion where applicable law allows. Marketing communications can be
            opted out via the link in those messages. Service-related notices may still be sent when necessary.
          </p>
        </section>
        <section className="group border-t pt-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <ChevronRight className="text-blue-600" /> Contact us
          </h2>
          <div className="text-gray-600 leading-relaxed ml-8">
            <p className="mb-4">Privacy questions or requests:</p>
            <ul className="list-disc list-inside space-y-2">
              <li>
                Email:{' '}
                <a href={`mailto:${CONTACT.email}`} className="text-blue-600 font-medium hover:underline">
                  {CONTACT.email}
                </a>
              </li>
              <li>
                Phone:{' '}
                <a href={`tel:${CONTACT.phoneTel}`} className="text-blue-600 font-medium hover:underline">
                  {CONTACT.phoneDisplay}
                </a>
              </li>
              <li>Address: {CONTACT.address}</li>
            </ul>
          </div>
        </section>
      </div>
    </main>
    <Footer />
  </div>
)

function App() {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/refund" element={<Refund />} />
        <Route path="/privacy" element={<Privacy />} />
      </Routes>
    </Router>
  )
}

export default App
