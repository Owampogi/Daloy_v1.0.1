import { useState, useRef, useEffect } from "react";
import { ChevronDown, HelpCircle, MessageCircle, Users, Clock, Zap, MessageSquare, Building2, CheckCircle2, Facebook } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
  icon?: React.ElementType;
}

const faqItems: FAQItem[] = [
  {
    question: "I already reply to customers. Why would I need Daloy?",
    answer: "The real question is: are you replying to every customer, every time?\n\nMany businesses lose sales because inquiries get buried, forgotten, or delayed. Daloy helps make sure every lead gets acknowledged, followed up, and tracked—even when you're busy.",
    icon: MessageCircle
  },
  {
    question: "We don't get that many inquiries. Is this still worth it?",
    answer: "Sometimes missing just a few inquiries a month can mean losing significant revenue.\n\nDaloy helps businesses stay consistent with responses and follow-ups so potential customers don't slip through the cracks.",
    icon: Users
  },
  {
    question: "Can't I just hire someone to answer messages?",
    answer: "You can, but people get busy, take breaks, forget follow-ups, or work limited hours.\n\nDaloy works 24/7, responds instantly, and supports your team by handling repetitive tasks so they can focus on closing deals and serving customers.",
    icon: Clock
  },
  {
    question: "My team keeps forgetting to follow up. Can Daloy help with that?",
    answer: "Yes.\n\nDaloy can automatically send follow-ups, reminders, and updates based on your workflow so prospects don't go cold simply because someone forgot to reach out.",
    icon: Zap
  },
  {
    question: "What if customers ask questions the AI doesn't know?",
    answer: "No problem.\n\nDaloy can hand the conversation over to a real person whenever needed. The goal isn't to replace human interaction—it's to make sure customers get help faster.",
    icon: HelpCircle
  },
  {
    question: "We use Facebook Messenger. Do I need to change how we work?",
    answer: "No.\n\nDaloy can work alongside the channels you already use. Customers continue messaging you as usual while Daloy helps manage conversations behind the scenes.",
    icon: Facebook
  },
  {
    question: "Is this only for big companies?",
    answer: "Not at all.\n\nDaloy is built specifically for growing businesses, clinics, real estate teams, agencies, service providers, and SMEs that want a better way to manage customer inquiries without adding more manual work.",
    icon: Building2
  },
  {
    question: "How do I know if Daloy is right for my business?",
    answer: "If you've ever said:\n\n• \"Ang daming messages, hindi ko na mabantayan.\"\n• \"May mga inquiry pala na hindi namin nareplyan.\"\n• \"Nakalimutan namin mag-follow up.\"\n• \"Sayang yung lead, hindi na bumalik.\"\n\nThen Daloy was built to solve exactly those problems.",
    icon: CheckCircle2
  }
];

function FAQSection() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const contentRefs = useRef<(HTMLDivElement | null)[]>([]);

  const toggleFAQ = (index: number) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  useEffect(() => {
    // Reset heights when active index changes
    contentRefs.current.forEach((ref, idx) => {
      if (ref && activeIndex === idx) {
        ref.style.maxHeight = `${ref.scrollHeight}px`;
      } else if (ref) {
        ref.style.maxHeight = "0px";
      }
    });
  }, [activeIndex]);

  return (
    <section className="py-20 md:py-28 bg-gradient-to-b from-white to-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-5">
            <HelpCircle className="h-4 w-4" />
            <span>FAQ</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-5">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed">
            Everything you need to know about Daloy. Can't find what you're looking for? 
            <a href="/contact" className="text-primary font-semibold hover:underline ml-1">
              Contact our team →
            </a>
          </p>
        </div>

        {/* FAQ Items */}
        <div className="max-w-3xl mx-auto space-y-3">
          {faqItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = activeIndex === index;

            return (
              <div
                key={index}
                className="bg-white rounded-2xl border border-gray-200 transition-all duration-200 hover:border-primary/30"
              >
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full px-6 py-5 flex items-center justify-between gap-4 text-left hover:bg-gray-50/50 rounded-2xl transition-colors"
                >
                  <div className="flex items-start gap-4 flex-1">
                    {Icon && (
                      <Icon className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    )}
                    <h3 className="text-lg font-semibold text-gray-900 pr-4">
                      {item.question}
                    </h3>
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 text-gray-400 flex-shrink-0 transition-transform duration-300 ${
                      isActive ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <div
                  ref={(el) => (contentRefs.current[index] = el)}
                  className="overflow-hidden transition-all duration-300 ease-in-out"
                  style={{ maxHeight: "0px" }}
                >
                  <div className="px-6 pb-5 pt-0">
                    <div className="border-t border-gray-100 pt-4">
                      <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA Section */}
        <div className="max-w-3xl mx-auto mt-12">
          <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-2xl p-8 text-center border border-primary/20">
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              Ready to streamline your customer conversations?
            </h3>
            <p className="text-gray-600 mb-6">
              Join thousands of businesses using Daloy to never miss a lead again.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/signup"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                Start Free Trial
                <Zap className="h-4 w-4" />
              </a>
              <a
                href="/demo"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-700 font-semibold rounded-xl border-2 border-gray-200 hover:border-primary/50 hover:text-primary transition-all"
              >
                Schedule a Demo
                <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
              </a>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              Free 14-day trial · No credit card required · Cancel anytime
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default FAQSection;