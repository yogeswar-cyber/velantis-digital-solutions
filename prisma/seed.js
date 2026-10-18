import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Seed Development Admin User
  const adminEmail = process.env.ADMIN_DEFAULT_EMAIL || 'yogesyogi13@gmail.com';
  const rawPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'VELANTISAURA33';
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash,
      role: 'ADMIN',
      name: 'Yogeswar (Admin)',
    },
    create: {
      email: adminEmail,
      passwordHash,
      name: 'Yogeswar (Admin)',
      role: 'ADMIN',
    },
  });
  console.log(`👤 Development admin user created/verified: ${admin.email}`);

  // 2. Define Initial Services & Structured Features
  const servicesData = [
    {
      name: 'Website Development',
      slug: 'website-development',
      description: 'Modern, responsive websites that represent your brand and help you grow.',
      icon: 'Code2',
      displayOrder: 1,
      features: [
        { name: 'Responsive Design', category: 'Core', description: 'Fully optimized for mobile, tablet, and desktop' },
        { name: 'Admin Dashboard', category: 'Management', description: 'Secure management portal for content and analytics' },
        { name: 'Authentication & Accounts', category: 'Security', description: 'Secure user login, roles, and session management' },
        { name: 'Database Integration', category: 'Backend', description: 'Normalized database architecture and APIs' },
        { name: 'SEO & Performance Optimization', category: 'Growth', description: 'Search-engine friendly structure and fast load times' },
        { name: 'Payment Gateway', category: 'Commerce', description: 'Stripe, Razorpay, or custom checkout integration' },
        { name: 'Analytics & Tracking', category: 'Analytics', description: 'Visitor traffic insights and conversions' },
        { name: 'Business Landing Pages', category: 'Design', description: 'High-conversion lead generation landing pages' },
      ],
    },
    {
      name: 'E-Commerce Solutions',
      slug: 'e-commerce-solutions',
      description: 'Complete online stores to sell your products with ease.',
      icon: 'ShoppingCart',
      displayOrder: 2,
      features: [
        { name: 'Product Catalog', category: 'Core', description: 'Filterable product inventory with image galleries' },
        { name: 'Shopping Cart & Checkout', category: 'Core', description: 'Seamless checkout with instant order confirmation' },
        { name: 'Payment Gateway Integration', category: 'Payments', description: 'Secure online card, UPI, and net-banking payments' },
        { name: 'Order Management System', category: 'Management', description: 'Track orders, status changes, and shipping status' },
        { name: 'Customer Accounts', category: 'Users', description: 'Order history, profile management, and saved addresses' },
        { name: 'Inventory & Stock Alerts', category: 'Operations', description: 'Automated low-stock alerts and tracking' },
      ],
    },
    {
      name: 'Booking Systems',
      slug: 'booking-systems',
      description: 'Smart booking solutions for appointments and reservations.',
      icon: 'CalendarDays',
      displayOrder: 3,
      features: [
        { name: 'Interactive Calendar', category: 'Core', description: 'Date and time slot picker with real-time availability' },
        { name: 'Appointment Scheduling', category: 'Core', description: 'Self-service client appointment bookings' },
        { name: 'Email & WhatsApp Confirmations', category: 'Notifications', description: 'Automated booking confirmations and reminders' },
        { name: 'Staff Availability Management', category: 'Management', description: 'Custom schedule management for team members' },
        { name: 'Cancellation & Rescheduling', category: 'Operations', description: 'Self-service rescheduling rules and management' },
      ],
    },
    {
      name: 'Digital Business Setup',
      slug: 'digital-business-setup',
      description: 'Get your business online and reach more customers easily.',
      icon: 'Store',
      displayOrder: 4,
      features: [
        { name: 'Google Business Profile Setup', category: 'Setup', description: 'Verified listing with business details and photos' },
        { name: 'Google Maps Presence', category: 'Local SEO', description: 'Accurate location pin, hours, and direction routing' },
        { name: 'WhatsApp Business Configuration', category: 'Messaging', description: 'Quick replies, business catalog, and automation' },
        { name: 'Instagram Profile Optimization', category: 'Social', description: 'Bio, highlights, link-in-bio, and branding' },
      ],
    },
    {
      name: 'Design Services',
      slug: 'design-services',
      description: 'Creative designs that make your brand stand out.',
      icon: 'Palette',
      displayOrder: 5,
      features: [
        { name: 'Logo Design & Brand Identity', category: 'Branding', description: 'Vector logos, color palettes, and typography rules' },
        { name: 'Visiting Cards & Stationery', category: 'Print', description: 'Print-ready business cards and corporate stationery' },
        { name: 'Posters & Digital Brochures', category: 'Marketing', description: 'Marketing flyers, brochures, and promo materials' },
        { name: 'Social Media Creatives', category: 'Digital', description: 'Instagram, LinkedIn, and promotional graphics' },
      ],
    },
    {
      name: 'Social Media Services',
      slug: 'social-media-services',
      description: 'Engaging content to grow your presence on social media.',
      icon: 'Megaphone',
      displayOrder: 6,
      features: [
        { name: 'Instagram Post Designs', category: 'Content', description: 'High-engagement post templates and carousels' },
        { name: 'Reels Editing', category: 'Video', description: 'Paced video edits with captions and sound design' },
        { name: 'Content Planning & Calendar', category: 'Strategy', description: 'Monthly posting plan aligned with your business goals' },
        { name: 'Monthly Account Management', category: 'Management', description: 'Consistent scheduling and audience interaction' },
      ],
    },
    {
      name: 'Video Editing',
      slug: 'video-editing',
      description: 'High-quality videos to promote your business and products.',
      icon: 'Video',
      displayOrder: 7,
      features: [
        { name: 'Business Promotional Videos', category: 'Promo', description: 'Engaging brand story and service showcase videos' },
        { name: 'Reels & Shorts Editing', category: 'Social', description: 'Vertical 9:16 videos with dynamic typography' },
        { name: 'Product Demo Videos', category: 'Product', description: 'Clean feature highlights and customer walkthroughs' },
        { name: 'YouTube Video Editing', category: 'Long-form', description: 'Color grading, B-roll, and audio cleanup' },
      ],
    },
    {
      name: 'AI Automation',
      slug: 'ai-automation',
      description: 'Bring AI into your business to save time and improve efficiency.',
      icon: 'Bot',
      displayOrder: 8,
      features: [
        { name: 'FAQ & Support Chatbot', category: 'Chatbots', description: 'Automated 24/7 client question answering' },
        { name: 'Website AI Assistant', category: 'Chatbots', description: 'Interactive AI guide embedded in your website' },
        { name: 'Automated Enquiry Handling', category: 'Workflows', description: 'Instant response and enquiry qualification' },
        { name: 'AI Content Generation Pipeline', category: 'Content', description: 'Automated drafting for emails, posts, or reports' },
      ],
    },
    {
      name: 'Business Automation',
      slug: 'business-automation',
      description: 'Automate repetitive tasks and streamline your workflow.',
      icon: 'Workflow',
      displayOrder: 9,
      features: [
        { name: 'Form to Google Sheet Integration', category: 'Data', description: 'Instantly sync form submissions to Google Sheets' },
        { name: 'Email & WhatsApp Notifications', category: 'Alerts', description: 'Instant alerts on new leads and bookings' },
        { name: 'Automated Customer Confirmations', category: 'Customer', description: 'Instant confirmation receipts with reference IDs' },
        { name: 'Custom Zapier / Webhook Flows', category: 'Integration', description: 'Connect CRM, spreadsheets, and communication apps' },
      ],
    },
    {
      name: 'Dashboard & Data Services',
      slug: 'dashboard-data-services',
      description: 'Turn your data into useful insights with custom dashboards.',
      icon: 'BarChart3',
      displayOrder: 10,
      features: [
        { name: 'Sales & Revenue Dashboard', category: 'Dashboards', description: 'Visual charts for sales trends, orders, and performance' },
        { name: 'Inventory & Stock Dashboard', category: 'Dashboards', description: 'Real-time stock balance, turnover, and alerts' },
        { name: 'Employee & Operations Dashboard', category: 'Management', description: 'Task progress and team performance overview' },
        { name: 'Excel / Google Sheets Automation', category: 'Automation', description: 'Formulas, macros, and automated report pipelines' },
      ],
    },
    {
      name: 'Technical Support',
      slug: 'technical-support',
      description: 'Keep your digital assets running smoothly and securely.',
      icon: 'Wrench',
      displayOrder: 11,
      features: [
        { name: 'Website Maintenance & Updates', category: 'Maintenance', description: 'Regular updates, dependency patches, and backups' },
        { name: 'Domain & Hosting Setup', category: 'Infrastructure', description: 'DNS configuration, SSL, and server deployment' },
        { name: 'Business Email Configuration', category: 'Email', description: 'Google Workspace or Zoho custom domain email setup' },
        { name: 'Bug Fixing & Troubleshooting', category: 'Support', description: 'Diagnosing and resolving UI and server errors' },
        { name: 'Website Migration', category: 'Migration', description: 'Zero-downtime transfer to new servers or hosts' },
      ],
    },
    {
      name: 'Basic Cybersecurity',
      slug: 'basic-cybersecurity',
      description: 'Add an extra layer of security to your digital presence.',
      icon: 'ShieldCheck',
      displayOrder: 12,
      features: [
        { name: 'Website Security Review', category: 'Audit', description: 'Audit for common web vulnerabilities and misconfigurations' },
        { name: 'SSL / HTTPS Hardening', category: 'Encryption', description: 'Strict Transport Security (HSTS) and secure certificates' },
        { name: 'Security Headers Configuration', category: 'Hardening', description: 'CSP, X-Frame-Options, and Referrer-Policy setup' },
        { name: 'Basic Vulnerability Assessment', category: 'Testing', description: 'Evaluation of public endpoints and input protections' },
      ],
    },
  ];

  // 3. Upsert Services and Features
  for (const svc of servicesData) {
    const { features, ...serviceFields } = svc;
    const serviceRecord = await prisma.service.upsert({
      where: { slug: serviceFields.slug },
      update: serviceFields,
      create: serviceFields,
    });

    console.log(`📦 Synced service: ${serviceRecord.name}`);

    let featureOrder = 1;
    for (const feat of features) {
      // Find or create feature
      const existing = await prisma.feature.findFirst({
        where: {
          serviceId: serviceRecord.id,
          name: feat.name,
        },
      });

      if (existing) {
        await prisma.feature.update({
          where: { id: existing.id },
          data: {
            description: feat.description,
            category: feat.category,
            displayOrder: featureOrder++,
          },
        });
      } else {
        await prisma.feature.create({
          data: {
            serviceId: serviceRecord.id,
            name: feat.name,
            description: feat.description,
            category: feat.category,
            displayOrder: featureOrder++,
          },
        });
      }
    }
  }

  console.log('✅ Database seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Database seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
