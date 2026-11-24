import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Camera,
  Video,
  Film,
  Sparkles,
  Store,
  Megaphone,
  MessageSquare,
  Star,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';

// ── Monochrome asset imports ────────────────────────────────────────────────
import heroImg    from '../assets/visual_workz_hero.jpg';
import weddingImg from '../assets/visual_workz_wedding.jpg';
import birthdayImg from '../assets/visual_workz_birthday.jpg';
import carImg     from '../assets/visual_workz_car.jpg';
import babyImg    from '../assets/visual_workz_baby.jpg';
import shopImg    from '../assets/visual_workz_shop.jpg';

// ── VISUAL_WORKZ_ Service Catalog ───────────────────────────────────────────
const VW_SERVICES = [
  {
    slug: 'birthday-shoot',
    name: 'Birthday Shoot',
    price: '₹999',
    icon: Camera,
    cover: birthdayImg,
    desc: 'Candid event coverage, cake cutting, and 25+ color-graded portraits — delivered within 48 h.',
    deliverables: ['25+ Color-Graded Photos', 'Candid & Cake Cutting Coverage', '48-Hour Rapid Delivery', 'Portrait Frames'],
  },
  {
    slug: 'wedding-reels-shoot',
    name: 'Wedding Reels Shoot',
    price: '₹2,499',
    icon: Video,
    cover: weddingImg,
    desc: '3 cinematic trending reels, audio sync, aesthetic couple shots and 4K footage.',
    deliverables: ['3 Cinematic Reels (9:16)', 'Audio Sync & Transitions', 'Bride & Groom Sequences', '4K Footage Delivery'],
  },
  {
    slug: 'engagement-reels-shoot',
    name: 'Engagement Reels Shoot',
    price: '₹1,999',
    icon: Sparkles,
    cover: weddingImg,
    desc: 'Ring ceremony highlights, couple portraits and 2 stylized social reels.',
    deliverables: ['2 Stylized Reels (9:16)', 'Ring Ceremony Highlights', 'Romantic Portrait Sequences', '48h Turnaround'],
  },
  {
    slug: 'car-delivery-shoot',
    name: 'Car Delivery Shoot',
    price: '₹1,499',
    icon: Film,
    cover: carImg,
    desc: 'Showroom unveiling cinematic video, keys handover b-roll and high-energy reel.',
    deliverables: ['Showroom Unveiling Video', 'Keys Handover Moments', 'Dynamic Automotive B-Roll', 'High-Energy Transition Edit'],
  },
  {
    slug: 'baby-birthday-shoot',
    name: 'Baby Birthday Shoot',
    price: '₹999',
    icon: Camera,
    cover: babyImg,
    desc: 'Gentle natural light portraits, milestone smiles and warm pastel color grading.',
    deliverables: ['Gentle Natural Light Portraits', 'Milestone Smiles & Candids', 'Tender Family Moments', 'Soft Pastel Color Grading'],
  },
  {
    slug: 'shop-opening-shoot',
    name: 'Shop Opening Shoot',
    price: '₹1,499',
    icon: Store,
    cover: shopImg,
    desc: 'Ribbon cutting, interior showcase, customer walkthrough and 1 promotional reel.',
    deliverables: ['Ribbon Cutting Coverage', 'Interior & Product Showcase', '1 Promotional Reel', 'Opening Day Candids'],
  },
  {
    slug: 'promotional-shoot',
    name: 'Promotional Shoot',
    price: '₹2,499',
    icon: Megaphone,
    cover: shopImg,
    desc: 'Creative brand or product showcase, professional lighting and storyboarded multi-format ads.',
    deliverables: ['Creative Brand Showcase', 'Professional Lighting Setup', 'Storyboard-Aligned Visuals', 'Multi-Format Deliverables'],
  },
  {
    slug: 'reels-shoot',
    name: 'Reels Shoot',
    price: '₹999',
    icon: Film,
    cover: carImg,
    desc: '1 high-impact 60s vertical reel — trend research, fast-cut pacing, music sync and grading.',
    deliverables: ['1 High-Impact 60s Reel (9:16)', 'Trend Research & Audio Match', 'Fast-Cut Transitions', 'Cinematic Color Grading'],
  },
];

// ── Portfolio tabs config ────────────────────────────────────────────────────
const PORTFOLIO = {
  Photos: [
    { src: weddingImg,  caption: 'Wedding — Candid portraits in natural backlight' },
    { src: birthdayImg, caption: 'Birthday — Celebration cake artistry' },
    { src: babyImg,     caption: 'Baby — Gentle milestone portrait' },
    { src: shopImg,     caption: 'Shop Opening — Ribbon ceremony frame' },
  ],
  Videos: [
    { src: carImg,     caption: 'Car Delivery — Automotive cinematic b-roll' },
    { src: shopImg,    caption: 'Shop Opening — Interior walkthrough reel' },
  ],
  Reels: [
    { src: weddingImg, caption: 'Wedding Reel — Trending audio sync edit' },
    { src: carImg,     caption: 'Car Reel — High-energy transition edit' },
  ],
};

// ── Helper: CTA button ───────────────────────────────────────────────────────
function VWBtn({ to, href, outline, children, onClick, style = {} }) {
  const cls = `vw-btn${outline ? ' vw-btn-outline' : ''}`;
  if (href) return <a href={href} className={cls} target="_blank" rel="noopener noreferrer" style={style}>{children}</a>;
  if (onClick) return <button className={cls} onClick={onClick} style={style}>{children}</button>;
  return <Link to={to} className={cls} style={style}>{children}</Link>;
}

// ── Main Page Component ──────────────────────────────────────────────────────
export default function VisualWorkzPage() {
  const [activeTab, setActiveTab] = useState('Photos');
  const navigate = useNavigate();

  const handleBookService = (slug, name, price) => {
    navigate(`/booking?division=visual-workz&service=${slug}&budget=${encodeURIComponent(price)}`);
  };

  return (
    <div className="vw-page">

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="vw-hero">
        <div className="vw-hero-overlay" />
        <img src={heroImg} alt="VISUAL_WORKZ_ — camera and lenses" className="vw-hero-bg" loading="eager" />
        <div className="container vw-hero-content">
          <div className="vw-hero-copy">
            <span className="vw-eyebrow">A CREATIVE DIVISION OF VELANTIS DIGITAL SOLUTIONS</span>
            <h1 className="vw-hero-title">
              VISUAL<span className="vw-underscore">_</span>WORKZ<span className="vw-underscore">_</span>
            </h1>
            <p className="vw-tagline">SMALL EVENTS &nbsp;|&nbsp; BIG MEMORIES</p>
            <p className="vw-sub-tagline">CAPTURE. CREATE. PRESERVE.</p>
            <p className="vw-hero-desc">
              Photography · Videography · Creative Reels — for every milestone that deserves to be remembered.
            </p>
            <div className="vw-hero-actions">
              <VWBtn to="/booking?division=visual-workz">Book Now <ArrowRight size={17} /></VWBtn>
              <VWBtn to="/contact?division=visual-workz" outline>Talk to Us <MessageSquare size={16} /></VWBtn>
            </div>
          </div>
        </div>
      </section>

      {/* ── DIVISION SWITCHER BAND ───────────────────────────────────────── */}
      <div className="vw-division-band">
        <span className="vw-active-division">📸 VISUAL_WORKZ_ — Creative Shoots</span>
        <Link to="/services" className="vw-switch-link">
          💻 Switch to Digital &amp; Tech Solutions <ChevronRight size={15} />
        </Link>
      </div>

      {/* ── ABOUT DIVISION ───────────────────────────────────────────────── */}
      <section className="vw-section vw-about">
        <div className="container vw-about-grid">
          <div className="vw-about-img">
            <img src={birthdayImg} alt="VISUAL_WORKZ_ — intimate celebration photography" loading="lazy" />
          </div>
          <div className="vw-about-copy">
            <span className="vw-eyebrow">ABOUT THE DIVISION</span>
            <h2>Small Events.<br /><em>Captured Forever.</em></h2>
            <p>
              VISUAL_WORKZ_ is VELANTIS DIGITAL SOLUTIONS' dedicated creative arm — focused on transforming
              intimate celebrations, personal milestones and brand moments into cinematic visual stories.
            </p>
            <p>
              We believe every event — big or small — deserves professional, heartfelt coverage. From birthday
              cake smiles and wedding vows to car-delivery keys and shop-opening ribbons — we capture it all
              with editorial precision and storytelling intent.
            </p>
            <div className="vw-about-pillars">
              {['Photography', 'Videography', 'Creative Reels', 'Rapid Delivery'].map((p) => (
                <span key={p}><CheckCircle2 size={15} /> {p}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SERVICES CATALOG ─────────────────────────────────────────────── */}
      <section className="vw-section vw-services-section">
        <div className="container">
          <div className="vw-section-title">
            <span className="vw-eyebrow">WHAT WE OFFER</span>
            <h2>Our Services &amp; <em>Packages</em></h2>
            <p>Every shoot includes professional gear, on-site direction and fast digital delivery.</p>
          </div>
          <div className="vw-service-grid">
            {VW_SERVICES.map((svc) => {
              const Icon = svc.icon;
              return (
                <article key={svc.slug} className="vw-service-card">
                  <div className="vw-service-cover">
                    <img src={svc.cover} alt={svc.name} loading="lazy" />
                    <span className="vw-price-badge">{svc.price}</span>
                  </div>
                  <div className="vw-service-body">
                    <div className="vw-service-head">
                      <Icon size={22} className="vw-service-icon" />
                      <h3>{svc.name}</h3>
                    </div>
                    <p>{svc.desc}</p>
                    <ul className="vw-deliverables">
                      {svc.deliverables.map((d) => (
                        <li key={d}><CheckCircle2 size={13} /> {d}</li>
                      ))}
                    </ul>
                    <button
                      className="vw-btn vw-book-btn"
                      onClick={() => handleBookService(svc.slug, svc.name, svc.price)}
                    >
                      Book This Shoot <ArrowRight size={16} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── PORTFOLIO ────────────────────────────────────────────────────── */}
      <section className="vw-section vw-portfolio-section">
        <div className="container">
          <div className="vw-section-title">
            <span className="vw-eyebrow">OUR PORTFOLIO</span>
            <h2>Captured <em>Moments.</em></h2>
            <p>A glimpse at our work across events, celebrations and brand stories.</p>
          </div>
          <div className="vw-portfolio-tabs">
            {Object.keys(PORTFOLIO).map((tab) => (
              <button
                key={tab}
                className={`vw-tab${activeTab === tab ? ' vw-tab-active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'Photos' && <Camera size={16} />}
                {tab === 'Videos' && <Video size={16} />}
                {tab === 'Reels'  && <Film  size={16} />}
                {tab}
              </button>
            ))}
          </div>
          <div className="vw-portfolio-grid">
            {PORTFOLIO[activeTab].map((item, i) => (
              <figure key={i} className="vw-portfolio-item">
                <img src={item.src} alt={item.caption} loading="lazy" />
                {activeTab !== 'Photos' && (
                  <div className="vw-play-overlay">
                    <div className="vw-play-btn">▶</div>
                  </div>
                )}
                <figcaption>{item.caption}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY VISUAL_WORKZ_ ────────────────────────────────────────────── */}
      <section className="vw-section vw-why-section">
        <div className="container vw-why-grid">
          <div>
            <span className="vw-eyebrow">WHY CHOOSE US</span>
            <h2>More Than a Shoot.<br /><em>A Memory You'll Keep.</em></h2>
            <p>We show up equipped, stay present for the moments that matter, and hand you polished, shareable content fast.</p>
          </div>
          <div className="vw-why-cards">
            {[
              ['Professional Gear', 'DSLR + mirrorless cameras, primes and gimbal stabilisers for every shoot.'],
              ['Cinematic Editing', 'Color grading, audio sync and transitions that match your style.'],
              ['Fast Delivery', 'Most shoots delivered within 24–48 hours for instant sharing.'],
              ['Affordable Pricing', 'Starting at ₹999 — quality creative coverage for every budget.'],
            ].map(([title, text]) => (
              <div key={title} className="vw-why-card">
                <Star size={20} className="vw-why-icon" />
                <div>
                  <h4>{title}</h4>
                  <p>{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOOKING CTA ──────────────────────────────────────────────────── */}
      <section className="vw-cta-section">
        <div className="container vw-cta-inner">
          <div>
            <span className="vw-eyebrow">READY TO CAPTURE?</span>
            <h2>Book Your Shoot Today</h2>
            <p>Tell us about your event. We'll handle the camera — you enjoy the moment.</p>
          </div>
          <div className="vw-hero-actions">
            <VWBtn to="/booking?division=visual-workz">
              Book Now <ArrowRight size={17} />
            </VWBtn>
            <VWBtn
              href="https://wa.me/919876543210?text=Hi%2C%20I%27d%20like%20to%20book%20a%20VISUAL_WORKZ_%20shoot"
              outline
            >
              Chat on WhatsApp <ArrowUpRight size={16} />
            </VWBtn>
          </div>
        </div>
      </section>

      {/* ── FOOTER BAND ──────────────────────────────────────────────────── */}
      <div className="vw-footer-band">
        <span>VISUAL_WORKZ_ — A Creative Division of <strong>VELANTIS DIGITAL SOLUTIONS</strong></span>
        <Link to="/services">View All Digital &amp; Tech Services <ChevronRight size={14} /></Link>
      </div>
    </div>
  );
}
