import { useRef, useState } from "react";
import { QuestCard } from "../components/QuestCard";
import { questionsByDifficulty } from "../constants/index";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

const QuestPage = () => {
  const quizQuestions = [
    { ...questionsByDifficulty.beginner[0], difficulty: "beginner" },
    { ...questionsByDifficulty.intermediate[0], difficulty: "intermediate" },
    { ...questionsByDifficulty.difficult[0], difficulty: "difficult" },
  ];

  const ref = useRef();

  const containerRef = useRef();

  const boxRef = useRef();

  const [currentIndex, setCurrentIndex] = useState(0);

  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);

  const handleAnswer = (selectedOption) => {
    const correctAnswer = quizQuestions[currentIndex].answer;

    if (selectedOption === correctAnswer) {
      setCorrectCount((prev) => prev + 1);
    } else {
      setWrongCount((prev) => prev + 1);
    }

    gsap.to(ref.current, {
      x: "300%",
      duration: 0.5,
      onComplete: () => {
        setCurrentIndex((prev) => prev + 1);
      },
    });
  };

  useGSAP(() => {
    if (!containerRef.current) return;
    const tl = gsap.timeline();
    tl.fromTo(
      containerRef.current,
      {
        clipPath: "circle(0% at 50% 50%)",
      },
      {
        clipPath: "circle(100% at 50% 50%)",
        duration: 1,
      },
    ).fromTo(
      boxRef.current,
      {
        clipPath: "polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)",
      },
      {
        clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
        duration: 0.5,
      },
    );
  }, [currentIndex]);

  if (currentIndex >= quizQuestions.length) {
    return (
      <div
        ref={containerRef}
        className="h-screen relative flex items-center justify-center bg-[url('/images/quest-finish-bg.png')] bg-cover bg-center"
      >
        <div
          ref={boxRef}
          className="flex flex-col items-center justify-center gap-4 relative z-10 bg-[#fff4df] border-4 border-[#d2a56d] rounded-2xl lg:px-16 px-8 py-8"
        >
          <div className="flex flex-col items-center">
            <h2 className="text-3xl font-bold">Quest Finished </h2>
            <img
              src="../../images/Confetti.gif"
              alt="confetti"
              className="w-20 h-20"
            />
          </div>

          <p className="text-xl text-green-600">✅ Correct: {correctCount}</p>

          <p className="text-xl text-red-500">❌ Wrong: {wrongCount}</p>
        </div>
      </div>
    );
  }

  const currentQuestion = quizQuestions[currentIndex];

  return (
    <main
      style={{ backgroundImage: "url(/images/quest.png)" }}
      className=" bg-cover bg-center h-screen"
    >
      <div className="flex items-center justify-center  px-4">
        <QuestCard
          key={currentIndex}
          ref={ref}
          question={currentQuestion.question}
          options={currentQuestion.options}
          difficulty={currentQuestion.difficulty}
          onAnswer={handleAnswer}
        />
      </div>
    </main>
  );
};

export default QuestPage;
