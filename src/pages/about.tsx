import { LoaderFunctionArgs, useLoaderData } from "react-router-dom";

export const aboutLoader = async (_: LoaderFunctionArgs) => {
  // You can fetch data here later if needed
  return {
    title: "about us",
    description:
      "hiya! this is maranomad, i hope you have enjoyed your expereince so far!!",
  };
};

const About = () => {
  const data = useLoaderData() as {
    title: string;
    description: string;
  };

  return (
    <div className="font-eskool max-w-screen-2xl mx-auto pt-10 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-semibold mb-6 text-center">
          {data.title}
        </h1>

        <p className="text-gray-700 text-base leading-relaxed mb-4">
          {data.description}
        </p>
        <h4 className="text-xl">
          where does the name come from?
        </h4>
        <p className="text-gray-700 text-base leading-relaxed mb-4">
          When I was younger, my family and I lived on a boat in the Bahamas. 
          As I started to meet other kids on my travels, I needed a way to contact them, 
          so my dad helped me create my very first email (which i still have to this day). 
          He named it "maranomad". So in honor of my past and future travels, my family, 
          and my roots, i named this project "maranomad" in hopes that it would grow with me as the name has all these years.
        </p>

        <h4 className="text-xl">
          who runs maranomad?
        </h4>
        <p className="text-gray-700 text-base leading-relaxed mb-4">
          Hi! My name is Mara Williams. As an engineering student who spends too much time looking at technical reference manuals, I wanted to challenge myself to bring more creativity into my daily life.
          As a lover of art, fashion, and thrifting, I wanted to bring the three together into the ambitious project you see here!
          All items in this shop are thrifted, designed, and painted by me!
        </p>

            <h4 className="text-xl">
            a message to you! ❤︎
        </h4>
        <p className="text-gray-700 text-base leading-relaxed mb-4">
          Thank you so much for popping by! 
          I just wanted to take the time to say you are loved, you are so amazing, and I hope your taking care of yourself.
          with much love, mara 
        </p>

        <h4 className="text-xl">
          a note
        </h4>
        <p className="text-gray-700 text-base leading-relaxed mb-20">
          This website was designed and coded by me. As such, functionality and usability may lack in some areas. If you have any suggestions on how to improve the website, please let me know! I always love to hear feedback.
        </p>

  <div className="columns-1 sm:columns-3 gap-6 my-20">
  {[
    "/assets/profile.JPG",
    "/assets/climbing.jpg",
    "/assets/fit.jpg",
    "/assets/camp.JPG",
    "/assets/ropes.jpg",
  ].map((src, i) => (
    <img
      key={i}
      src={src}
      alt="Maranomad gallery"
      className="w-full mb-6 rounded-lg break-inside-avoid"
    />
  ))}
</div>

</div>
    </div>
    
  );
};

export default About;
