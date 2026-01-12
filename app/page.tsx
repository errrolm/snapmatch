"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const SYMBOL_POOLS = [
  "●",
  "■",
  "▲",
  "◆",
  "○",
  "□",
  "△",
  "◇",
  "▢",
  "✦",
  "✶",
  "✸",
  "✺",
  "✹",
  "✷",
  "✵",
  "✻",
  "✽",
  "✿",
  "✷",
];

const DIFFICULTIES = {
  easy: {
    cols: 4,
    total: 16,
    speed: 0.14,
    shuffleOn: "none" as const,
    timeLimit: 60,
  },
  hard: {
    cols: 6,
    total: 36,
    speed: 0.14,
    shuffleOn: "every3moves" as const,
    timeLimit: 180,
  },
};

type DiffKey = keyof typeof DIFFICULTIES;

function shuffle<T>(arr: T[]) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function ensureLength<T>(pool: T[], count: number) {
  const out: T[] = [];
  while (out.length < count) out.push(...shuffle(pool));
  return out.slice(0, count);
}

function makeDeck(diff: DiffKey) {
  const cfg = DIFFICULTIES[diff];
  const total = cfg.total;
  const pairCount = total / 2;
  const symbols = ensureLength(SYMBOL_POOLS, pairCount);
  return shuffle(
    symbols.flatMap((s, i) => [
      { id: `${s}-a-${i}`, s },
      { id: `${s}-b-${i}`, s },
    ])
  ).slice(0, total);
}

export default function Page() {
  const [showLevelModal, setShowLevelModal] = useState(true);
  const [showWinModal, setShowWinModal] = useState(false);
  const [showLoseModal, setShowLoseModal] = useState(false);
  const [diff, setDiff] = useState<DiffKey>("easy");
  const [deck, setDeck] = useState(() => makeDeck("easy"));
  const [revealed, setRevealed] = useState<string[]>([]);
  const [matchedIds, setMatchedIds] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [lock, setLock] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (running) {
      timerRef.current = window.setInterval(
        () => setSeconds((s) => s + 1),
        1000
      );
      return () => window.clearInterval(timerRef.current ?? undefined);
    }
    return undefined;
  }, [running]);

  useEffect(() => {
    const cfg = DIFFICULTIES[diff];
    if (seconds >= cfg.timeLimit && running) {
      setRunning(false);
      if (timerRef.current) window.clearInterval(timerRef.current);
      setShowLoseModal(true);
    }
  }, [seconds, diff, running]);

  useEffect(() => {
    if (matchedIds.length === deck.length && deck.length > 0) {
      setRunning(false);
      if (timerRef.current) window.clearInterval(timerRef.current);
      setTimeout(() => setShowWinModal(true), 250);
    }
  }, [matchedIds, deck.length]);

  function startGame(selected?: DiffKey) {
    const key = selected ?? diff;
    setDiff(key);
    const d = makeDeck(key);
    setDeck(d);
    setRevealed([]);
    setMatchedIds([]);
    setMoves(0);
    setSeconds(0);
    setRunning(false);
    setLock(false);
    setShowWinModal(false);
    setShowLoseModal(false);
    setShowLevelModal(false);
  }

  function openLevelModalForNew() {
    setShowLevelModal(true);
  }

  function restartQuick() {
    startGame(diff);
  }

  function shuffleUnmatched(keepRevealed = true) {
    if (revealed.length > 0) return;

    setDeck((prev) => {
      const cloned = prev.map((c) => ({ ...c }));
      const revealedSet = new Set(keepRevealed ? revealed : []);
      const matchedSet = new Set(matchedIds);

      const unmatched = cloned.filter(
        (c) => !matchedSet.has(c.id) && !revealedSet.has(c.id)
      );
      const shuffledUnmatched = shuffle(unmatched);

      let uIndex = 0;
      return cloned.map((c) =>
        matchedSet.has(c.id) || (keepRevealed && revealedSet.has(c.id))
          ? c
          : shuffledUnmatched[uIndex++]
      );
    });
  }

  function flip(cardId: string) {
    if (lock) return;
    if (revealed.includes(cardId)) return;
    if (matchedIds.includes(cardId)) return;
    if (revealed.length >= 2) return;
    if (!running) setRunning(true);

    const next = [...revealed, cardId];
    setRevealed(next);

    if (next.length === 2) {
      setLock(true);
      setMoves((m) => m + 1);
      const a = deck.find((c) => c.id === next[0])!;
      const b = deck.find((c) => c.id === next[1])!;
      const isMatch = a.s === b.s;
      const cfg = DIFFICULTIES[diff];

      if (isMatch) {
        window.setTimeout(() => {
          setMatchedIds((m) => [...m, a.id, b.id]);
          setRevealed([]);
          setLock(false);
          if (cfg.shuffleOn === "every3moves") {
            if ((moves + 1) % 3 === 0) shuffleUnmatched(true);
          }
        }, Math.max(120, cfg.speed * 400));
      } else {
        window.setTimeout(() => {
          setRevealed([]);
          setLock(false);
        }, Math.max(220, cfg.speed * 700));
      }
    }
  }

  function formatTime(s: number) {
    const m = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${m}:${ss}`;
  }

  const cfg = DIFFICULTIES[diff];
  const cols = cfg.cols;
  const totalPairs = deck.length / 2;
  const matchedPairs = Math.floor(matchedIds.length / 2);
  const accuracyPct = totalPairs
    ? Math.round((matchedPairs / totalPairs) * 100)
    : 0;
  const timeLimit = cfg.timeLimit;
  const timePct = Math.min(100, Math.round((seconds / timeLimit) * 100));
  const timeRemaining = Math.max(0, timeLimit - seconds);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-screen-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-semibold">snapMatch</h1>
            <p className="text-sm sm:text-base text-neutral-400">
              Timed pattern-matching game
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap justify-end">
            <div className="text-sm sm:text-base text-neutral-200 text-center px-3 py-1 bg-neutral-900 rounded-md">
              <div className="font-semibold tracking-wide">Moves</div>
              <div className="text-xl sm:text-2xl font-extrabold">{moves}</div>
            </div>

            <div className="text-sm sm:text-base text-neutral-200 text-center px-3 py-1 bg-neutral-900 rounded-md">
              <div className="font-semibold tracking-wide">Time</div>
              <div className="text-xl sm:text-2xl font-extrabold">
                {formatTime(seconds)}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={openLevelModalForNew}
                className="bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 cursor-pointer px-3 py-2"
              >
                New
              </Button>

              <Button
                onClick={() => shuffleUnmatched(true)}
                className="bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 cursor-pointer px-3 py-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-arrow-down-up-icon lucide-arrow-down-up"
                >
                  <path d="m3 16 4 4 4-4" />
                  <path d="M7 20V4" />
                  <path d="m21 8-4-4-4 4" />
                  <path d="M17 4v16" />
                </svg>
                <span className="ml-2 hidden sm:inline">Reshuffle</span>
              </Button>

              <Button
                onClick={restartQuick}
                className="bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 cursor-pointer px-3 py-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-rotate-cw-icon lucide-rotate-cw"
                >
                  <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                </svg>
                <span className="ml-2 hidden sm:inline">Restart</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="mb-3">
          <div className="h-2 w-full bg-neutral-800 rounded overflow-hidden border border-neutral-700">
            <div
              className="h-full bg-emerald-600 transition-all"
              style={{ width: `${timePct}%` }}
            />
          </div>
          <div className="text-xs text-neutral-500 mt-2 flex items-center justify-between">
            <div>
              {formatTime(seconds)} / {formatTime(timeLimit)}
            </div>
            <div>{timeRemaining}s left</div>
          </div>
        </div>

        <div
          className="grid gap-2 sm:gap-3"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {deck.map((c) => {
            const revealedNow =
              revealed.includes(c.id) || matchedIds.includes(c.id);
            const isMatched = matchedIds.includes(c.id);
            const disabled = revealedNow || lock;
            return (
              <button
                key={c.id}
                onClick={() => flip(c.id)}
                disabled={disabled}
                aria-label={revealedNow ? `${c.s} revealed` : "hidden card"}
                className={`relative w-full aspect-square ${
                  disabled ? "cursor-default" : "cursor-pointer"
                }`}
                style={{ touchAction: "manipulation" }}
              >
                <motion.div
                  initial={false}
                  animate={{ scale: revealedNow ? 1.02 : 1 }}
                  transition={{ duration: cfg.speed }}
                  className="absolute inset-0 rounded-xl overflow-hidden"
                >
                  <Card
                    className={`absolute inset-0 flex items-center justify-center transition-colors duration-200 ${
                      isMatched
                        ? "bg-emerald-700 border-emerald-600"
                        : "bg-neutral-900 border border-neutral-800"
                    }`}
                  >
                    <CardContent className="text-neutral-600 text-2xl opacity-90">
                      ?
                    </CardContent>
                  </Card>

                  <motion.div
                    initial={false}
                    animate={{
                      opacity: revealedNow ? 1 : 0,
                      scale: revealedNow ? 1 : 0.88,
                    }}
                    transition={{ duration: Math.max(0.12, cfg.speed) }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <Card
                      className={`w-full h-full flex items-center justify-center transition-colors duration-200 rounded-md ${
                        isMatched
                          ? "bg-emerald-600 border-emerald-600 text-white"
                          : "bg-neutral-800 border border-neutral-700 text-white"
                      }`}
                    >
                      <CardContent className="text-3xl sm:text-4xl font-semibold select-none">
                        {c.s}
                      </CardContent>
                    </Card>
                  </motion.div>
                </motion.div>
              </button>
            );
          })}
        </div>

        {showWinModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="w-full max-w-md p-4 sm:p-6 rounded-xl bg-neutral-900 border border-neutral-800">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold">You win!</h2>
                <div className="text-xs text-neutral-400">Completed</div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="p-3 bg-neutral-800 rounded-lg text-center">
                  <div className="text-xs text-neutral-400">Moves</div>
                  <div className="text-lg font-semibold">{moves}</div>
                </div>
                <div className="p-3 bg-neutral-800 rounded-lg text-center">
                  <div className="text-xs text-neutral-400">Time</div>
                  <div className="text-lg font-semibold">
                    {formatTime(seconds)}
                  </div>
                </div>
                <div className="p-3 bg-neutral-800 rounded-lg text-center">
                  <div className="text-xs text-neutral-400">Accuracy</div>
                  <div className="text-lg font-semibold">{accuracyPct}%</div>
                </div>
              </div>

              <div className="mb-4 text-sm text-neutral-500">
                Matched pairs:{" "}
                <span className="font-medium">{matchedPairs}</span> /{" "}
                <span className="font-medium">{totalPairs}</span>
              </div>

              <div className="flex gap-3 justify-center">
                <Button
                  onClick={() => {
                    setShowWinModal(false);
                    restartQuick();
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-lg cursor-pointer"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-rotate-ccw-icon lucide-rotate-ccw"
                  >
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                  Play again
                </Button>

                <Button
                  onClick={() => {
                    setShowWinModal(false);
                    setShowLevelModal(true);
                  }}
                  className="bg-transparent border border-neutral-700 hover:bg-neutral-800 text-white px-4 py-2 rounded-lg cursor-pointer"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-settings-icon lucide-settings"
                  >
                    <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  Change level
                </Button>
              </div>
            </div>
          </div>
        )}

        {showLoseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="w-full max-w-md p-6 rounded-xl bg-neutral-900 border border-neutral-800">
              <h2 className="text-2xl font-semibold mb-2 text-rose-400">
                Time's up
              </h2>
              <p className="text-sm text-neutral-400 mb-4">
                You ran out of time.
              </p>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-neutral-800 rounded-lg text-center">
                  <div className="text-xs text-neutral-400">Moves</div>
                  <div className="text-lg font-semibold">{moves}</div>
                </div>
                <div className="p-3 bg-neutral-800 rounded-lg text-center">
                  <div className="text-xs text-neutral-400">Matched</div>
                  <div className="text-lg font-semibold">
                    {matchedPairs}/{totalPairs}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-center">
                <Button
                  onClick={() => {
                    setShowLoseModal(false);
                    restartQuick();
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-md cursor-pointer"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-rotate-ccw-icon lucide-rotate-ccw"
                  >
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                  Try again
                </Button>
                <Button
                  onClick={() => {
                    setShowLoseModal(false);
                    setShowLevelModal(true);
                  }}
                  className="bg-transparent border border-neutral-700 hover:bg-neutral-800 text-white px-4 py-2 rounded-md cursor-pointer"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-settings-icon lucide-settings"
                  >
                    <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  Change level
                </Button>
              </div>
            </div>
          </div>
        )}

        {showLevelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-md p-6 rounded-xl bg-neutral-900 border border-neutral-800">
              <h2 className="text-2xl font-semibold mb-2">Choose difficulty</h2>
              <p className="text-sm text-neutral-400 mb-4">
                Pick a grid size. Each mode is a timed round; finish all pairs
                before time runs out.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <button
                  onClick={() => startGame("easy")}
                  className="px-4 py-3 rounded-lg bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 cursor-pointer text-left"
                >
                  <div className="font-semibold">Easy</div>
                  <div className="text-xs text-neutral-400">4×4 — 1:00</div>
                </button>

                <button
                  onClick={() => startGame("hard")}
                  className="px-4 py-3 rounded-lg bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 cursor-pointer text-left"
                >
                  <div className="font-semibold">Hard</div>
                  <div className="text-xs text-neutral-400">
                    6×6 — 3:00 (shuffle occasionally)
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        <footer className="mt-8">
          <p className="text-sm sm:text-base text-neutral-300 text-center mb-4 font-medium tracking-wide">
            CTI Assignment • errolm
          </p>
        </footer>
      </div>
    </div>
  );
}
