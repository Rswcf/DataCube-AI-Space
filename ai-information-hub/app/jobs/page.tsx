import type { Metadata } from 'next'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'AI Jobs -- DACH Region',
  description:
    'Curated AI and machine learning job listings in Germany, Austria, and Switzerland. Find positions at BMW, SAP, Siemens, Bosch, and other leading DACH employers.',
}

type JobListing = {
  id: number
  title: string
  company: string
  companyInitial: string
  accentColor: string
  location: string
  jobType: string
  salaryMin: number
  salaryMax: number
  postedAgo: string
  description: string
  tags: string[]
}

const jobListings: JobListing[] = [
  {
    id: 1,
    title: 'Senior ML Engineer',
    company: 'BMW Group',
    companyInitial: 'B',
    accentColor: 'bg-blue-600',
    location: 'Munich, Germany',
    jobType: 'Full-time',
    salaryMin: 85000,
    salaryMax: 120000,
    postedAgo: '2 days ago',
    description:
      'Design and deploy production ML pipelines for autonomous driving perception systems. Work with LiDAR, camera, and radar sensor fusion.',
    tags: ['Python', 'PyTorch', 'MLOps', 'Computer Vision'],
  },
  {
    id: 2,
    title: 'AI Product Manager',
    company: 'SAP SE',
    companyInitial: 'S',
    accentColor: 'bg-blue-500',
    location: 'Walldorf, Germany',
    jobType: 'Full-time',
    salaryMin: 90000,
    salaryMax: 130000,
    postedAgo: '3 days ago',
    description:
      'Lead the product strategy for AI-powered enterprise features in SAP Business AI. Collaborate with engineering and research teams to ship LLM integrations.',
    tags: ['Product Management', 'LLMs', 'Enterprise AI', 'Agile'],
  },
  {
    id: 3,
    title: 'NLP Research Scientist',
    company: 'Siemens AG',
    companyInitial: 'S',
    accentColor: 'bg-teal-600',
    location: 'Berlin, Germany',
    jobType: 'Full-time',
    salaryMin: 80000,
    salaryMax: 115000,
    postedAgo: '1 day ago',
    description:
      'Conduct applied NLP research for industrial automation use cases. Develop multilingual models for technical documentation understanding and generation.',
    tags: ['NLP', 'Transformers', 'Python', 'Hugging Face'],
  },
  {
    id: 4,
    title: 'Computer Vision Engineer',
    company: 'Robert Bosch GmbH',
    companyInitial: 'B',
    accentColor: 'bg-red-600',
    location: 'Stuttgart, Germany',
    jobType: 'Full-time',
    salaryMin: 75000,
    salaryMax: 105000,
    postedAgo: '5 days ago',
    description:
      'Develop real-time computer vision algorithms for industrial quality inspection. Optimize deep learning models for edge deployment on embedded hardware.',
    tags: ['Computer Vision', 'C++', 'TensorRT', 'Edge AI'],
  },
  {
    id: 5,
    title: 'Head of AI / ML',
    company: 'Swiss Re',
    companyInitial: 'S',
    accentColor: 'bg-slate-700',
    location: 'Zurich, Switzerland',
    jobType: 'Full-time',
    salaryMin: 150000,
    salaryMax: 200000,
    postedAgo: '1 week ago',
    description:
      'Lead the AI/ML center of excellence for a global reinsurer. Set technical direction for predictive modeling, NLP-based claims processing, and risk assessment.',
    tags: ['Leadership', 'MLOps', 'Risk Modeling', 'Python'],
  },
  {
    id: 6,
    title: 'MLOps Engineer',
    company: 'Deutsche Telekom',
    companyInitial: 'D',
    accentColor: 'bg-pink-600',
    location: 'Berlin, Germany',
    jobType: 'Hybrid',
    salaryMin: 70000,
    salaryMax: 95000,
    postedAgo: '4 days ago',
    description:
      'Build and maintain ML infrastructure for network optimization models. Implement CI/CD pipelines for model training, evaluation, and deployment at scale.',
    tags: ['MLOps', 'Kubernetes', 'Python', 'AWS'],
  },
  {
    id: 7,
    title: 'AI Solutions Architect',
    company: 'Accenture DACH',
    companyInitial: 'A',
    accentColor: 'bg-purple-600',
    location: 'Vienna, Austria',
    jobType: 'Full-time',
    salaryMin: 80000,
    salaryMax: 110000,
    postedAgo: '3 days ago',
    description:
      'Design end-to-end AI solutions for enterprise clients across manufacturing, finance, and healthcare. Translate business requirements into scalable ML architectures.',
    tags: ['Solution Architecture', 'Azure AI', 'LLMs', 'Consulting'],
  },
  {
    id: 8,
    title: 'Data Scientist -- LLM Applications',
    company: 'Zalando SE',
    companyInitial: 'Z',
    accentColor: 'bg-orange-500',
    location: 'Berlin, Germany',
    jobType: 'Remote',
    salaryMin: 75000,
    salaryMax: 105000,
    postedAgo: '6 days ago',
    description:
      'Apply large language models to e-commerce challenges: product search, recommendation systems, and conversational shopping assistants.',
    tags: ['LLMs', 'Python', 'RAG', 'Recommendation Systems'],
  },
  {
    id: 9,
    title: 'Robotics AI Researcher',
    company: 'ABB Ltd',
    companyInitial: 'A',
    accentColor: 'bg-red-500',
    location: 'Zurich, Switzerland',
    jobType: 'Full-time',
    salaryMin: 110000,
    salaryMax: 160000,
    postedAgo: '2 days ago',
    description:
      'Research and develop AI-driven motion planning and object manipulation algorithms for industrial robotics. Publish at top-tier robotics and ML venues.',
    tags: ['Robotics', 'Reinforcement Learning', 'ROS', 'C++'],
  },
  {
    id: 10,
    title: 'AI Ethics & Governance Lead',
    company: 'Allianz SE',
    companyInitial: 'A',
    accentColor: 'bg-blue-800',
    location: 'Munich, Germany',
    jobType: 'Full-time',
    salaryMin: 85000,
    salaryMax: 120000,
    postedAgo: '1 week ago',
    description:
      'Establish AI governance frameworks and responsible AI practices across the insurance group. Lead compliance efforts for the EU AI Act and internal model risk management.',
    tags: ['AI Governance', 'EU AI Act', 'Risk Management', 'Policy'],
  },
  {
    id: 11,
    title: 'Senior Prompt Engineer',
    company: 'DeepL GmbH',
    companyInitial: 'D',
    accentColor: 'bg-indigo-600',
    location: 'Cologne, Germany',
    jobType: 'Remote',
    salaryMin: 70000,
    salaryMax: 100000,
    postedAgo: '3 days ago',
    description:
      'Optimize prompt engineering workflows for translation and writing assistance products. Evaluate model outputs across 30+ language pairs.',
    tags: ['Prompt Engineering', 'LLMs', 'NLP', 'Evaluation'],
  },
  {
    id: 12,
    title: 'ML Platform Engineer',
    company: 'Infineon Technologies',
    companyInitial: 'I',
    accentColor: 'bg-green-700',
    location: 'Graz, Austria',
    jobType: 'Hybrid',
    salaryMin: 65000,
    salaryMax: 90000,
    postedAgo: '5 days ago',
    description:
      'Build the internal ML platform powering semiconductor design optimization. Create self-service tools for data scientists across the organization.',
    tags: ['ML Platform', 'Python', 'Kubernetes', 'Data Engineering'],
  },
]

const jobTypeFilters = ['Full-time', 'Part-time', 'Contract', 'Remote']
const locationFilters = ['Germany', 'Austria', 'Switzerland', 'Remote']
const levelFilters = ['Junior', 'Mid', 'Senior', 'Lead']

function formatSalary(min: number, max: number): string {
  const fmt = (n: number) => n.toLocaleString('de-DE')
  return `EUR ${fmt(min)} -- ${fmt(max)}`
}

export default function JobsPage() {
  return (
    <article className="max-w-4xl mx-auto px-4 py-8">
      <header className="mb-8">
        <p className="text-sm text-gray-600">
          <a
            href="/"
            className="underline hover:no-underline focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            &larr; Back to Home
          </a>
        </p>
      </header>

      {/* Hero */}
      <section className="mb-10">
        <h1 className="text-3xl font-bold mb-3">AI &amp; ML Jobs -- DACH Region</h1>
        <p className="text-lg leading-relaxed text-gray-700">
          Curated artificial intelligence and machine learning positions at leading companies in
          Germany, Austria, and Switzerland. Updated regularly with roles from enterprise,
          research, and startup employers.
        </p>
      </section>

      {/* Filter Bar (visual only) */}
      <section className="mb-8" aria-label="Job filters">
        <div className="flex flex-wrap gap-6 border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div>
            <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Job Type
            </span>
            <div className="flex flex-wrap gap-1.5">
              {jobTypeFilters.map((f) => (
                <span
                  key={f}
                  className="inline-block border border-gray-300 rounded px-2.5 py-1 text-xs bg-white text-gray-700 cursor-default"
                >
                  {f}
                </span>
              ))}
            </div>
          </div>
          <div>
            <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Location
            </span>
            <div className="flex flex-wrap gap-1.5">
              {locationFilters.map((f) => (
                <span
                  key={f}
                  className="inline-block border border-gray-300 rounded px-2.5 py-1 text-xs bg-white text-gray-700 cursor-default"
                >
                  {f}
                </span>
              ))}
            </div>
          </div>
          <div>
            <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Level
            </span>
            <div className="flex flex-wrap gap-1.5">
              {levelFilters.map((f) => (
                <span
                  key={f}
                  className="inline-block border border-gray-300 rounded px-2.5 py-1 text-xs bg-white text-gray-700 cursor-default"
                >
                  {f}
                </span>
              ))}
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-1.5">
          Filters are for display purposes. Functional filtering coming soon.
        </p>
      </section>

      {/* Job Listings */}
      <section className="mb-12">
        <h2 className="sr-only">Job Listings</h2>
        <div className="space-y-4">
          {jobListings.map((job) => (
            <div
              key={job.id}
              className="border border-gray-200 rounded-lg p-5 hover:shadow-md hover:border-gray-300 transition-shadow cursor-pointer"
            >
              <div className="flex items-start gap-4">
                {/* Company logo placeholder */}
                <span
                  className={`shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-full text-white text-sm font-bold ${job.accentColor}`}
                  aria-hidden="true"
                >
                  {job.companyInitial}
                </span>

                <div className="min-w-0 flex-1">
                  {/* Title + Salary row */}
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-1">
                    <h3 className="text-base font-semibold">{job.title}</h3>
                    <span className="text-sm font-medium text-green-700 whitespace-nowrap tabular-nums">
                      {formatSalary(job.salaryMin, job.salaryMax)}
                    </span>
                  </div>

                  {/* Company + Location + Type + Posted */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600 mb-2">
                    <span className="font-medium">{job.company}</span>
                    <span aria-hidden="true" className="text-gray-300">|</span>
                    <span>{job.location}</span>
                    <span aria-hidden="true" className="text-gray-300">|</span>
                    <span>{job.jobType}</span>
                    <span aria-hidden="true" className="text-gray-300">|</span>
                    <span className="text-gray-400">{job.postedAgo}</span>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-600 leading-relaxed mb-3">
                    {job.description}
                  </p>

                  {/* Tags + Apply button */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-1.5">
                      {job.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-block bg-gray-100 text-gray-700 rounded px-2 py-0.5 text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <a
                      href="#"
                      className="inline-block bg-blue-600 text-white text-xs font-medium px-4 py-1.5 rounded hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-primary focus:outline-none transition-colors"
                    >
                      Apply
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Post a Job CTA */}
      <section className="mb-12 border border-gray-200 rounded-lg p-6 bg-gray-50">
        <h2 className="text-2xl font-semibold mb-3">Post a Job</h2>
        <p className="text-sm leading-relaxed text-gray-700 mb-4">
          Reach AI and ML professionals across the DACH region. Your listing will be visible to
          thousands of qualified candidates visiting Data Cube AI for daily AI news.
        </p>

        <div className="overflow-x-auto mb-6">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-gray-200 px-4 py-2 text-left font-semibold bg-white">
                  Plan
                </th>
                <th className="border border-gray-200 px-4 py-2 text-left font-semibold bg-white">
                  Includes
                </th>
                <th className="border border-gray-200 px-4 py-2 text-left font-semibold bg-white whitespace-nowrap">
                  Price
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-200 px-4 py-2 font-medium bg-white">
                  Standard
                </td>
                <td className="border border-gray-200 px-4 py-2 bg-white">
                  30-day listing, standard placement
                </td>
                <td className="border border-gray-200 px-4 py-2 bg-white tabular-nums whitespace-nowrap">
                  EUR 99
                </td>
              </tr>
              <tr>
                <td className="border border-gray-200 px-4 py-2 font-medium bg-white">
                  Featured
                </td>
                <td className="border border-gray-200 px-4 py-2 bg-white">
                  30-day listing, highlighted placement, social media promotion
                </td>
                <td className="border border-gray-200 px-4 py-2 bg-white tabular-nums whitespace-nowrap">
                  EUR 249
                </td>
              </tr>
              <tr>
                <td className="border border-gray-200 px-4 py-2 font-medium bg-white">
                  Premium
                </td>
                <td className="border border-gray-200 px-4 py-2 bg-white">
                  60-day listing, top placement, newsletter inclusion, dedicated social post
                </td>
                <td className="border border-gray-200 px-4 py-2 bg-white tabular-nums whitespace-nowrap">
                  EUR 499
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <a
          href="mailto:jobs@datacubeai.space?subject=Job%20Posting%20Inquiry"
          className="inline-block bg-blue-600 text-white text-sm font-medium px-6 py-2.5 rounded hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-primary focus:outline-none transition-colors"
        >
          Contact Us to Post a Job
        </a>
      </section>

      <footer className="mt-12 border-t border-gray-200 pt-6">
        <div className="flex gap-4 text-sm">
          <a
            href="/"
            className="underline hover:no-underline focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            Home
          </a>
          <span className="text-gray-400">|</span>
          <a
            href="/impressum"
            className="underline hover:no-underline focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            Impressum
          </a>
          <span className="text-gray-400">|</span>
          <a
            href="/datenschutz"
            className="underline hover:no-underline focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            Datenschutz
          </a>
        </div>
      </footer>
    </article>
  )
}
