import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
} from "react-native";
import { generateQuestion, type Question } from "./src/game/questionGenerator";
import { PRESETS, type PresetKey } from "./src/game/presets";

type Hero = {
  id: string;
  name: string;
  sport: string;
  power: string;
  emoji: string;
};

type Profile = {
  id: number;
  name: string;
  age: number;
  hero: string;
  level: number;
  coins: number;
  xp: number;
  answered: number;
  correct: number;
  accuracy: number;
  upgrades: { speed: number; accuracy: number; shield: number };
};

type Session = {
  correct: number;
  answered: number;
  coins: number;
  xp: number;
  hearts: number;
  combo: number;
  superShots: number;
  bossCharge: number;
  bossHits: number;
  saves: number;
  goalsAgainst: number;
  topicBreakdown: Record<string, { answered: number; correct: number }>;
};

type Shot = {
  lane: number;
  id: number;
  progress: number;
  speed: number;
};

type Screen = "profiles" | "home" | "game" | "results" | "dashboard";

const HEROES: Hero[] = [
  { id: "blaze", name: "Blaze Bolt", sport: "Goalkeeper", power: "Lightning Save", emoji: "⚡" },
  { id: "ace", name: "Captain Ace", sport: "Striker", power: "Power Stop", emoji: "⚽" },
  { id: "nova", name: "Nova Dunk", sport: "Defender", power: "Sky Block", emoji: "🏀" },
];

const STARTER_PROFILES: Profile[] = [
  {
    id: 1,
    name: "Alex",
    age: 6,
    hero: "blaze",
    level: 1,
    coins: 0,
    xp: 0,
    answered: 0,
    correct: 0,
    accuracy: 0,
    upgrades: { speed: 1, accuracy: 1, shield: 1 },
  },
  {
    id: 2,
    name: "Sam",
    age: 8,
    hero: "ace",
    level: 1,
    coins: 0,
    xp: 0,
    answered: 0,
    correct: 0,
    accuracy: 0,
    upgrades: { speed: 1, accuracy: 1, shield: 1 },
  },
];

const EMPTY_SESSION: Session = {
  correct: 0,
  answered: 0,
  coins: 0,
  xp: 0,
  hearts: 3,
  combo: 0,
  superShots: 0,
  bossCharge: 0,
  bossHits: 0,
  saves: 0,
  goalsAgainst: 0,
  topicBreakdown: {},
};

function xpToNext(level: number): number {
  return 100 + (level - 1) * 40;
}

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildShot(speed = 8): Shot {
  return { lane: rand(0, 2), id: Date.now() + Math.random(), progress: 0, speed };
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function GoalkeeperArena({
  shot,
  selectedLane,
  onSelectLane,
  feedback,
}: {
  shot: Shot;
  selectedLane: number;
  onSelectLane: (lane: number) => void;
  feedback: string;
}) {
  return (
    <View style={styles.arenaContainer}>
      <Text style={styles.sectionTitle}>Goalkeeper Mode</Text>
      <View style={styles.goalRow}>
        {[0, 1, 2].map((laneIndex) => {
          const isActive = shot.lane === laneIndex;
          const isSelected = selectedLane === laneIndex;
          const showSave = feedback === "save" && isActive && isSelected;
          const showGoal = feedback === "goal" && isActive;
          const ballTop = Math.min(80, 14 + shot.progress * 0.66);
          return (
            <Pressable
              key={laneIndex}
              onPress={() => onSelectLane(laneIndex)}
              style={[styles.goalCard, isSelected && styles.goalCardSelected]}
            >
              <Text style={styles.goalTitle}>
                {laneIndex === 0 ? "Left Goal" : laneIndex === 1 ? "Centre Goal" : "Right Goal"}
              </Text>
              <View style={[styles.trackLine, isActive && styles.trackLineActive]} />
              <View style={[styles.trackLineBottom, isActive && styles.trackLineActiveBottom]} />
              <View style={[styles.trackCenter, isActive && styles.trackCenterActive]} />
              {isActive ? (
                <>
                  <View style={[styles.ballTrail, { top: `${Math.min(82, 12 + shot.progress * 0.66)}%` }]} />
                  <View style={[styles.ball, { top: `${ballTop}%` }]} />
                </>
              ) : null}
              <Text style={styles.glove}>{isSelected ? "🧤" : "🥅"}</Text>
              {showSave ? <Text style={styles.saveText}>SAVE!</Text> : null}
              {showGoal ? <Text style={styles.goalText}>GOAL</Text> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function App() {
  const resolveShotRef = useRef(false);

  const [screen, setScreen] = useState<Screen>("profiles");
  const [profiles, setProfiles] = useState<Profile[]>(STARTER_PROFILES);
  const [selectedId, setSelectedId] = useState<number>(STARTER_PROFILES[0].id);
  const [question, setQuestion] = useState<Question>(generateQuestion(6, 1, false));
  const [answer, setAnswer] = useState<string>("");
  const [feedbackText, setFeedbackText] = useState<string | null>(null);
  const [arenaFeedback, setArenaFeedback] = useState<string>("idle");
  const [difficulty, setDifficulty] = useState<number>(1);
  const [timeLeft, setTimeLeft] = useState<number>(600);
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [preset, setPreset] = useState<PresetKey>("easy");
  const [timerEnabled, setTimerEnabled] = useState<boolean>(PRESETS.easy.timerEnabled);
  const [movingGoalEnabled, setMovingGoalEnabled] = useState<boolean>(PRESETS.easy.movingGoalEnabled);
  const [session, setSession] = useState<Session>(EMPTY_SESSION);
  const [selectedLane, setSelectedLane] = useState<number>(1);
  const [currentShot, setCurrentShot] = useState<Shot>(buildShot());
  const [newProfileName, setNewProfileName] = useState<string>("");
  const [newProfileAge, setNewProfileAge] = useState<string>("7");

  const profile = useMemo(() => profiles.find((p) => p.id === selectedId) || profiles[0], [profiles, selectedId]);
  const hero = HEROES.find((h) => h.id === profile.hero) || HEROES[0];
  const activePreset = PRESETS[preset];
  const accuracy = session.answered ? Math.round((session.correct / session.answered) * 100) : 0;

  function applyPreset(nextPreset: PresetKey) {
    setPreset(nextPreset);
    setTimerEnabled(PRESETS[nextPreset].timerEnabled);
    setMovingGoalEnabled(PRESETS[nextPreset].movingGoalEnabled);
  }

  useEffect(() => {
    if (screen !== "game") return;
    if (!timerEnabled) return;
    if (timeLeft <= 0) {
      setScreen("results");
      return;
    }
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [screen, timeLeft, timerEnabled]);

  useEffect(() => {
    if (screen !== "game") return;
    if (!movingGoalEnabled) return;
    if (feedbackText) return;

    const interval = setInterval(() => {
      setCurrentShot((prev) => {
        const nextProgress = prev.progress + prev.speed * 0.08;
        if (nextProgress >= 100 && !resolveShotRef.current) {
          resolveShotRef.current = true;
          setArenaFeedback("goal");
          setFeedbackText("Too slow — goal scored. Move faster.");
          setSession((s) => {
            const nextHearts = Math.max(0, s.hearts - 1);
            const updated = { ...s, hearts: nextHearts, combo: 0, goalsAgainst: s.goalsAgainst + 1 };
            if (nextHearts <= 0) {
              setTimeout(() => setScreen("results"), 500);
            }
            return updated;
          });
          setTimeout(() => {
            resolveShotRef.current = false;
            setFeedbackText(null);
            nextQuestion(difficulty);
          }, 700);
          return { ...prev, progress: 100 };
        }
        return { ...prev, progress: Math.min(100, nextProgress) };
      });
    }, 80);

    return () => clearInterval(interval);
  }, [screen, feedbackText, difficulty, movingGoalEnabled]);

  function startGame() {
    const startDifficulty = Math.max(1, Math.floor((profile.age - 4) / 2));
    setDifficulty(startDifficulty);
    setQuestion(generateQuestion(profile.age, startDifficulty, activePreset.hardcore));
    setAnswer("");
    setFeedbackText(null);
    setArenaFeedback("idle");
    setTimeLeft(600);
    setSession(EMPTY_SESSION);
    setSelectedLane(1);
    setCurrentShot(buildShot(activePreset.baseShotSpeed + startDifficulty));
    resolveShotRef.current = false;
    setScreen("game");
  }

  function nextQuestion(nextDifficulty = difficulty) {
    setQuestion(generateQuestion(profile.age, nextDifficulty, activePreset.hardcore));
    setAnswer("");
    setCurrentShot(buildShot(activePreset.baseShotSpeed + nextDifficulty));
    setArenaFeedback("idle");
  }

  function submitAnswer(forcedAnswer?: string) {
    if (resolveShotRef.current) return;
    resolveShotRef.current = true;

    const userAnswer = String(forcedAnswer ?? answer).trim().toLowerCase();
    const correctAnswer = String(question.answer).trim().toLowerCase();
    const mathsCorrect = userAnswer === correctAnswer;
    const laneCorrect = selectedLane === currentShot.lane;
    const lateShot = movingGoalEnabled && activePreset.hardcore && currentShot.progress > 82;
    const isSave = mathsCorrect && laneCorrect && !lateShot;

    setSession((prev) => {
      const nextAnswered = prev.answered + 1;
      const nextCorrect = prev.correct + (mathsCorrect ? 1 : 0);
      const nextCombo = isSave ? prev.combo + 1 : 0;
      const comboBonus = isSave ? Math.min(nextCombo, 8) * 3 : 0;
      const nextCoins = prev.coins + (isSave ? 12 : mathsCorrect ? 4 : 0) + comboBonus;
      const nextXp = prev.xp + (isSave ? 16 : mathsCorrect ? 6 : 2);
      const nextHearts = isSave ? prev.hearts : Math.max(0, prev.hearts - 1);

      const topicBreakdown = {
        ...prev.topicBreakdown,
        [question.topic]: {
          answered: (prev.topicBreakdown[question.topic]?.answered || 0) + 1,
          correct: (prev.topicBreakdown[question.topic]?.correct || 0) + (mathsCorrect ? 1 : 0),
        },
      };

      return {
        ...prev,
        answered: nextAnswered,
        correct: nextCorrect,
        combo: nextCombo,
        coins: nextCoins,
        xp: nextXp,
        hearts: nextHearts,
        saves: prev.saves + (isSave ? 1 : 0),
        goalsAgainst: prev.goalsAgainst + (isSave ? 0 : 1),
        topicBreakdown,
      };
    });

    setArenaFeedback(isSave ? "save" : "goal");
    setFeedbackText(
      isSave
        ? "Great save!"
        : lateShot
          ? "Too late — the shot was already in."
          : mathsCorrect
            ? "Right answer, wrong goal. Watch the shot path and move your glove."
            : `Missed — answer: ${question.answer}`
    );

    setTimeout(() => {
      resolveShotRef.current = false;
      setFeedbackText(null);
      nextQuestion(difficulty);
    }, 700);
  }

  function addProfile() {
    if (!newProfileName.trim()) return;
    const heroId = HEROES[profiles.length % HEROES.length].id;
    const nextProfile: Profile = {
      id: Date.now(),
      name: newProfileName.trim(),
      age: Number(newProfileAge),
      hero: heroId,
      level: 1,
      coins: 0,
      xp: 0,
      answered: 0,
      correct: 0,
      accuracy: 0,
      upgrades: { speed: 1, accuracy: 1, shield: 1 },
    };
    setProfiles((prev) => [...prev, nextProfile]);
    setNewProfileName("");
    setNewProfileAge("7");
  }

  if (screen === "profiles") {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.headerCard}>
            <View>
              <Text style={styles.title}>Math Champs</Text>
              <Text style={styles.subtitle}>Expo mobile app foundation</Text>
            </View>
            <Text style={styles.cardSub}>{soundOn ? "Sound On" : "Sound Off"}</Text>
          </View>

          {profiles.map((p) => {
            const currentHero = HEROES.find((item) => item.id === p.hero) || HEROES[0];
            return (
              <Pressable key={p.id} style={styles.profileCard} onPress={() => { setSelectedId(p.id); setScreen("home"); }}>
                <Text style={styles.heroEmoji}>{currentHero.emoji}</Text>
                <Text style={styles.cardTitle}>{p.name}</Text>
                <Text style={styles.cardSub}>Age {p.age} · Level {p.level}</Text>
                <Text style={styles.muted}>Coins: {p.coins}</Text>
              </Pressable>
            );
          })}

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Add Profile</Text>
            <TextInput value={newProfileName} onChangeText={setNewProfileName} placeholder="Child name" style={styles.input} />
            <TextInput value={newProfileAge} onChangeText={setNewProfileAge} placeholder="Age" keyboardType="numeric" style={styles.input} />
            <Pressable style={styles.primaryButton} onPress={addProfile}>
              <Text style={styles.primaryButtonText}>Add New Player</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === "home") {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.heroCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.badge}>{hero.sport} Hero</Text>
              <Text style={[styles.title, { color: "#fff" }]}>{profile.name}, meet {hero.name}</Text>
              <Text style={styles.heroCopy}>Watch the ball path, move your glove, and solve the maths to make the save.</Text>
            </View>
            <Text style={styles.heroEmojiLarge}>{hero.emoji}</Text>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Parent difficulty preset</Text>
            {Object.entries(PRESETS).map(([key, value]) => (
              <Pressable
                key={key}
                onPress={() => applyPreset(key as PresetKey)}
                style={[styles.presetCard, preset === key && styles.presetCardActive]}
              >
                <Text style={styles.cardTitle}>{value.label}</Text>
                <Text style={styles.cardSub}>{value.description}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Parent controls</Text>
            <View style={styles.switchRow}>
              <Text style={styles.cardSub}>Round timer</Text>
              <Switch value={timerEnabled} onValueChange={setTimerEnabled} />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.cardSub}>Moving shots</Text>
              <Switch value={movingGoalEnabled} onValueChange={setMovingGoalEnabled} />
            </View>
          </View>

          <Pressable style={styles.primaryButton} onPress={startGame}>
            <Text style={styles.primaryButtonText}>Start Round</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === "game") {
    return (
      <SafeAreaView style={[styles.safe, styles.gameSafe]}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.statGrid}>
            <StatCard label="Time" value={timerEnabled ? `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, "0")}` : "Off"} />
            <StatCard label="Combo" value={`x${Math.max(1, session.combo)}`} />
            <StatCard label="Saves" value={session.saves} />
            <StatCard label="Goals In" value={session.goalsAgainst} />
            <StatCard label="Coins" value={session.coins} />
            <StatCard label="Mode" value={activePreset.label} />
          </View>

          <View style={styles.gameCard}>
            <Text style={styles.badge}>{question.topic}</Text>
            <GoalkeeperArena shot={currentShot} selectedLane={selectedLane} onSelectLane={setSelectedLane} feedback={arenaFeedback} />

            <View style={styles.infoCard}>
              <Text style={styles.infoText}>
                {activePreset.hardcore
                  ? "Hardcore mode: shots are faster, maths is tougher, and late answers can still concede a goal."
                  : movingGoalEnabled
                    ? "Watch the live shot and move your glove before it reaches the goal."
                    : "Watch the shot lane, move your glove, then solve without rush."}
              </Text>
            </View>

            <View style={styles.questionCard}>
              <Text style={styles.questionLabel}>Solve it fast</Text>
              <Text style={styles.questionText}>{question.prompt}</Text>
            </View>

            <View style={styles.statGridSmall}>
              <StatCard label="Your Glove" value={selectedLane === 0 ? "Left" : selectedLane === 1 ? "Centre" : "Right"} />
              <StatCard label="Accuracy" value={`${accuracy}%`} />
              <StatCard label="Hearts" value={session.hearts} />
            </View>

            {activePreset.hardcore && question.options ? (
              <View style={styles.optionsGrid}>
                {question.options.map((option) => (
                  <Pressable key={option} style={styles.optionButton} onPress={() => submitAnswer(option)}>
                    <Text style={styles.optionButtonText}>{option}</Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <View style={styles.answerRow}>
                <TextInput value={answer} onChangeText={setAnswer} placeholder="Type answer" style={[styles.input, styles.answerInput]} />
                <Pressable style={styles.primaryButton} onPress={() => submitAnswer()}>
                  <Text style={styles.primaryButtonText}>Save</Text>
                </Pressable>
              </View>
            )}

            {feedbackText ? (
              <View style={styles.feedbackCard}>
                <Text style={styles.feedbackText}>{feedbackText}</Text>
              </View>
            ) : null}

            <Pressable style={styles.secondaryButton} onPress={() => setScreen("results")}>
              <Text style={styles.secondaryButtonText}>Finish Session</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === "results") {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.sectionCard}>
            <Text style={styles.heroEmojiLarge}>🏆</Text>
            <Text style={styles.title}>Great round, {profile.name}</Text>
            <Text style={styles.subtitle}>Your Maths Champ session is complete.</Text>
          </View>
          <View style={styles.statGridSmall}>
            <StatCard label="Correct" value={session.correct} />
            <StatCard label="Answered" value={session.answered} />
            <StatCard label="Saves" value={session.saves} />
            <StatCard label="Coins" value={session.coins} />
          </View>
          <Pressable style={styles.primaryButton} onPress={() => setScreen("home")}>
            <Text style={styles.primaryButtonText}>Back to Home</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  gameSafe: { backgroundColor: "#0f172a" },
  container: { padding: 16, gap: 16 },
  headerCard: { backgroundColor: "#fff", borderRadius: 24, padding: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heroCard: { backgroundColor: "#1e293b", borderRadius: 24, padding: 20, flexDirection: "row", alignItems: "center", gap: 16 },
  sectionCard: { backgroundColor: "#fff", borderRadius: 24, padding: 16, gap: 12 },
  profileCard: { backgroundColor: "#fff", borderRadius: 24, padding: 18, gap: 6 },
  title: { fontSize: 28, fontWeight: "700", color: "#0f172a" },
  subtitle: { fontSize: 14, color: "#475569" },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#0f172a" },
  badge: { color: "#e2e8f0", fontSize: 13, marginBottom: 8 },
  heroCopy: { color: "#cbd5e1", fontSize: 14 },
  heroEmoji: { fontSize: 36 },
  heroEmojiLarge: { fontSize: 72, textAlign: "center" },
  cardTitle: { fontSize: 18, fontWeight: "700", color: "#0f172a" },
  cardSub: { fontSize: 14, color: "#475569" },
  muted: { color: "#64748b" },
  input: { backgroundColor: "#fff", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: "#e2e8f0" },
  answerInput: { flex: 1 },
  primaryButton: { backgroundColor: "#0f172a", borderRadius: 18, paddingHorizontal: 18, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  primaryButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  secondaryButton: { backgroundColor: "#fff", borderRadius: 18, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  secondaryButtonText: { color: "#0f172a", fontWeight: "700" },
  presetCard: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 18, padding: 14, gap: 6 },
  presetCardActive: { borderColor: "#0f172a", backgroundColor: "#f1f5f9" },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statGridSmall: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: { backgroundColor: "#111827", borderRadius: 18, padding: 14, minWidth: 100 },
  statLabel: { color: "#cbd5e1", fontSize: 12 },
  statValue: { color: "#fff", fontSize: 22, fontWeight: "700" },
  gameCard: { backgroundColor: "#1d4ed8", borderRadius: 28, padding: 16, gap: 16 },
  arenaContainer: { backgroundColor: "rgba(255,255,255,0.10)", borderRadius: 24, padding: 12, gap: 12 },
  goalRow: { flexDirection: "row", gap: 10 },
  goalCard: { flex: 1, height: 240, borderRadius: 22, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", backgroundColor: "rgba(255,255,255,0.05)", overflow: "hidden", alignItems: "center" },
  goalCardSelected: { borderColor: "rgba(255,255,255,0.9)", backgroundColor: "rgba(255,255,255,0.14)" },
  goalTitle: { marginTop: 10, color: "#dbeafe", fontSize: 12, fontWeight: "600" },
  trackLine: { position: "absolute", top: 36, left: 18, right: 18, height: 4, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.10)" },
  trackLineActive: { backgroundColor: "rgba(253,224,71,0.80)" },
  trackLineBottom: { position: "absolute", bottom: 72, left: 18, right: 18, height: 4, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.10)" },
  trackLineActiveBottom: { backgroundColor: "rgba(253,224,71,0.45)" },
  trackCenter: { position: "absolute", top: 44, bottom: 80, width: 2, backgroundColor: "rgba(255,255,255,0.10)" },
  trackCenterActive: { backgroundColor: "rgba(253,224,71,0.35)" },
  ballTrail: { position: "absolute", width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(254,240,138,0.45)", opacity: 0.16 },
  ball: { position: "absolute", width: 40, height: 40, borderRadius: 20, backgroundColor: "#fde047" },
  glove: { position: "absolute", bottom: 18, fontSize: 42 },
  saveText: { position: "absolute", bottom: 72, fontWeight: "700", color: "#d1fae5" },
  goalText: { position: "absolute", bottom: 72, fontWeight: "700", color: "#fecaca" },
  infoCard: { backgroundColor: "rgba(255,255,255,0.10)", borderRadius: 18, padding: 14 },
  infoText: { color: "#dbeafe", fontSize: 14 },
  questionCard: { backgroundColor: "rgba(255,255,255,0.10)", borderRadius: 24, padding: 18, alignItems: "center", gap: 8 },
  questionLabel: { color: "#dbeafe", textTransform: "uppercase", fontSize: 12, fontWeight: "700" },
  questionText: { color: "#fff", fontSize: 28, fontWeight: "700", textAlign: "center" },
  answerRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  optionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  optionButton: { width: "48%", backgroundColor: "#fff", borderRadius: 18, minHeight: 56, alignItems: "center", justifyContent: "center" },
  optionButtonText: { color: "#0f172a", fontWeight: "700", fontSize: 18 },
  feedbackCard: { backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 18, padding: 14 },
  feedbackText: { color: "#fff", fontWeight: "700", textAlign: "center" },
});
