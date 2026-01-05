import { useForm, ValidationError } from "@formspree/react";

const Contact = () => {
  // REPLACE "abcdwxyz" with your Formspree form ID
  const [state, handleSubmit] = useForm("mlgdkpgv");

  if (state.succeeded) {
    return (
      <div className="font-eskool max-w-screen-2xl mx-auto pt-10 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl font-semibold mb-6">thank you!</h1>
          <p className="text-gray-700 text-base leading-relaxed">
            your message has been sent successfully. i’ll get back to you as soon as possible ❤︎
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="font-eskool max-w-screen-2xl mx-auto pt-10 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl text-[#3a3d1c] font-semibold mb-6 text-center">contact us</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="text-[#3a3d1c] block text-sm mb-1">Name</label>
            <input
              id="name"
              type="text"
              name="name"
              placeholder="Your name"
              className="bg-white/50 w-full border border-gray-300 rounded-lg px-4 py-2 focus:bg-white/70 focus:outline-none focus:ring-1 focus:ring-[#3a3d1c]"
              required
            />
            <ValidationError prefix="Name" field="name" errors={state.errors} />
          </div>

          <div>
            <label htmlFor="email" className="text-[#3a3d1c] block text-sm mb-1">Email</label>
            <input
              id="email"
              type="email"
              name="email"
              placeholder="you@example.com"
              className="bg-white/50 w-full border border-gray-300 rounded-lg px-4 py-2 focus:bg-white/70 focus:outline-none focus:ring-1 focus:ring-[#3a3d1c]"
              required
            />
            <ValidationError prefix="Email" field="email" errors={state.errors} />
          </div>

          <div>
            <label htmlFor="message" className="text-[#3a3d1c] block text-sm mb-1">Message</label>
            <textarea
              id="message"
              name="message"
              rows={5}
              placeholder="Write your message here..."
              className="bg-white/50 w-full border border-gray-300 rounded-lg px-4 py-2 focus:bg-white/70 focus:outline-none focus:ring-1 focus:ring-[#3a3d1c]"
              required
            />
            <ValidationError prefix="Message" field="message" errors={state.errors} />
          </div>

          <button
            type="submit"
            disabled={state.submitting}
            className="w-full bg-[#3a3d1c] text-white py-2 rounded-lg hover:bg-gray-800 transition0colors duration-500"
          >
            {state.submitting ? "Sending..." : "Send Message"}
          </button>
        </form>

        <p className="text-sm text-gray-500 text-center mt-6">
          Or email me directly at{" "}
          <a href="mailto:maranomad@gmail.com" className="underline">
            maranomad@gmail.com
          </a>
        </p>
      </div>
    </div>
  );
};

export default Contact;
