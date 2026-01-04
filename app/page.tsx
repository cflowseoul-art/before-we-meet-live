"use client";

import { useState } from "react";

export default function Onboarding() {
  const [feature, setFeature] = useState("");
  const features = ["눈웃음", "맑은 피부", "직각 어깨", "오똑한 코", "보조개"];

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-2xl font-bold text-center mb-2 text-slate-800">미비포유 (Me Before You)</h1>
        <p className="text-center text-slate-500 mb-8">나를 알고 너를 아는 데이터 탐색</p>

        <div className="space-y-4">
          <label className="block font-semibold text-slate-700">당신의 가장 큰 외모 장점은?</label>
          <div className="grid grid-cols-2 gap-3">
            {features.map((item) => (
              <button
                key={item}
                onClick={() => setFeature(item)}
                className={`p-3 rounded-lg border text-sm transition ${
                  feature === item ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <button
          disabled={!feature}
          className="w-full mt-10 bg-indigo-600 text-white py-4 rounded-xl font-bold disabled:bg-slate-200 transition-all active:scale-95"
          onClick={() => alert(`${feature}를 선택하셨군요! 이제 동물 닉네임을 생성해볼까요?`)}
        >
          캐릭터 생성하기
        </button>
      </div>
    </main>
  );
}