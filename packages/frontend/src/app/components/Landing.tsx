import { Link } from "react-router";
import { Activity } from "lucide-react";

export function Landing() {
  return (
    <div className="min-h-screen bg-vibrant-mesh relative overflow-y-auto overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/10 backdrop-blur-md border-b border-white/20 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-12 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center border border-white/30">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <span className="text-white text-xl font-medium tracking-wide">ARIA</span>
            </div>
            <div className="flex items-center gap-12">
              <a href="#home" className="text-white/90 hover:text-white transition-colors text-sm font-medium tracking-wide">HOME</a>
              <a href="#about" className="text-white/90 hover:text-white transition-colors text-sm font-medium tracking-wide">ABOUT</a>
              <a href="#services" className="text-white/90 hover:text-white transition-colors text-sm font-medium tracking-wide">SERVICES</a>
              <a href="#contact" className="text-white/90 hover:text-white transition-colors text-sm font-medium tracking-wide">CONTACT US</a>
              <Link
                to="/login"
                className="border-2 border-white text-white px-6 py-1.5 rounded-full hover:bg-white hover:text-[#f07e4d] transition-all text-sm font-medium tracking-wide"
              >
                LOGIN
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="relative z-10 min-h-screen flex items-center pt-20">
        <div className="max-w-[1400px] mx-auto px-12 w-full">
          <div className="max-w-2xl">
            <h1 className="text-white text-7xl font-bold mb-4 leading-tight tracking-tight">
              ARIA
            </h1>
            <h2 className="text-white/90 text-2xl font-light mb-6 tracking-wide">
              Automated Risk & Intervention Assistant
            </h2>
            <p className="text-white/80 text-base mb-8 leading-relaxed max-w-xl">
              Real-time hemodynamic instability prediction powered by advanced AI. ARIA provides clinical decision support through intelligent risk assessment, predictive analytics, and actionable insights for ICU patient management.
            </p>
            <a
              href="#about"
              className="inline-block border-2 border-white text-white px-8 py-3 rounded-full hover:bg-white hover:text-[#f07e4d] transition-all text-sm font-bold tracking-wide shadow-md"
            >
              READ MORE
            </a>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="relative z-10 min-h-screen flex items-center bg-black/5 backdrop-blur-sm border-t border-white/10">
        <div className="max-w-[1400px] mx-auto px-12 py-24 w-full">
          <h2 className="text-4xl font-bold text-white mb-8">About ARIA</h2>
          <div className="grid grid-cols-2 gap-12 text-white/90">
            <p className="leading-relaxed">
              ICU clinicians often have to monitor dozens of patients simultaneously while detecting subtle warning signs hidden within large volumes of vital-sign data.
            </p>
            <p className="leading-relaxed">
              ARIA continuously analyzes patient data and generates early risk alerts using explainable AI, allowing clinicians to intervene hours before critical events occur.
            </p>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="relative z-10 min-h-screen flex items-center border-t border-white/10">
        <div className="max-w-[1400px] mx-auto px-12 py-24 w-full">
          <h2 className="text-4xl font-bold text-white mb-12">Core Features</h2>
          <div className="grid grid-cols-3 gap-8">
            {['Real-Time Monitoring', 'AI Risk Prediction', 'Explainable AI (SHAP)'].map((service, i) => (
              <div key={i} className="bg-white/10 p-8 rounded-3xl border border-white/20 backdrop-blur-md shadow-sm">
                <h3 className="text-xl font-bold text-white mb-4">{service}</h3>
                <p className="text-white/80 text-sm leading-relaxed">
                  Advanced clinical decision support tailored for high-stakes intensive care environments, ensuring timely and accountable interventions.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="relative z-10 min-h-[50vh] flex items-center bg-black/5 backdrop-blur-sm border-t border-white/10">
        <div className="max-w-[1400px] mx-auto px-12 py-24 w-full text-center">
          <h2 className="text-4xl font-bold text-white mb-6">Ready to transform ICU care?</h2>
          <p className="text-white/90 mb-8 max-w-xl mx-auto">
            Get in touch with our deployment team to schedule a technical demonstration of the ARIA clinical decision support system.
          </p>
          <a
            href="mailto:deploy@aria-medical.com"
            className="inline-block bg-white text-[#f07e4d] px-10 py-4 rounded-full hover:bg-gray-50 shadow-lg transition-all text-sm font-bold tracking-wide"
          >
            CONTACT US
          </a>
        </div>
      </section>
    </div>
  );
}