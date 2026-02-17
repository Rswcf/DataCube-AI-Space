import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { loadFont as loadNewsreader } from '@remotion/google-fonts/Newsreader';
import { loadFont as loadGeist } from '@remotion/google-fonts/Geist';

import { COLORS } from './theme';
import { HookScene } from './scenes/HookScene';
import { ProblemScene } from './scenes/ProblemScene';
import { BrandRevealScene } from './scenes/BrandRevealScene';
import { TechFeedScene } from './scenes/TechFeedScene';
import { InvestmentScene } from './scenes/InvestmentScene';
import { TipsFeedScene } from './scenes/TipsFeedScene';
import { AIFeaturesScene } from './scenes/AIFeaturesScene';
import { StatsScene } from './scenes/StatsScene';
import { CTAScene } from './scenes/CTAScene';
import { EndCardScene } from './scenes/EndCardScene';

// Load fonts
loadNewsreader();
loadGeist();

// Scene durations in frames (at 30fps) — matched to actual voiceover audio lengths + buffer
const SCENES = {
  hook: 210,        // 7s   (audio: 6.13s)
  problem: 390,     // 13s  (audio: 12.26s)
  brandReveal: 225, // 7.5s (audio: 6.59s)
  techFeed: 300,    // 10s  (audio: 9.06s)
  investment: 300,  // 10s  (audio: 9.43s)
  tips: 240,        // 8s   (audio: 7.29s)
  aiFeatures: 330,  // 11s  (audio: 10.36s)
  stats: 240,       // 8s   (audio: 7.06s)
  cta: 255,         // 8.5s (audio: 7.76s)
  endCard: 150,     // 5s   (audio: 3.99s)
};

const TRANSITION_DURATION = 15; // 0.5s fade between scenes

// Audio durations in frames (from actual ffprobe measurements)
const AUDIO = {
  hook: Math.ceil(6.13 * 30),
  problem: Math.ceil(12.26 * 30),
  brandReveal: Math.ceil(6.59 * 30),
  techFeed: Math.ceil(9.06 * 30),
  investment: Math.ceil(9.43 * 30),
  tips: Math.ceil(7.29 * 30),
  aiFeatures: Math.ceil(10.36 * 30),
  stats: Math.ceil(7.06 * 30),
  cta: Math.ceil(7.76 * 30),
  endCard: Math.ceil(3.99 * 30),
};

// Calculate audio start frames accounting for transitions
// In TransitionSeries, each scene starts = prev scene start + prev duration - transition overlap
function getAudioStarts() {
  const keys = Object.keys(SCENES) as (keyof typeof SCENES)[];
  const starts: Record<string, number> = {};
  let currentStart = 0;

  for (let i = 0; i < keys.length; i++) {
    starts[keys[i]] = currentStart;
    if (i < keys.length - 1) {
      currentStart += SCENES[keys[i]] - TRANSITION_DURATION;
    }
  }
  return starts;
}

const AUDIO_STARTS = getAudioStarts();

export const DataCubePromo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background }}>
      {/* Audio tracks — placed OUTSIDE TransitionSeries to avoid overlap issues */}
      <Sequence from={AUDIO_STARTS.hook} durationInFrames={AUDIO.hook}>
        <Audio src={staticFile('audio/promo/datacube-promo-scene1-hook.mp3')} />
      </Sequence>
      <Sequence from={AUDIO_STARTS.problem} durationInFrames={AUDIO.problem}>
        <Audio src={staticFile('audio/promo/datacube-promo-scene2-problem.mp3')} />
      </Sequence>
      <Sequence from={AUDIO_STARTS.brandReveal} durationInFrames={AUDIO.brandReveal}>
        <Audio src={staticFile('audio/promo/datacube-promo-scene3-brand.mp3')} />
      </Sequence>
      <Sequence from={AUDIO_STARTS.techFeed} durationInFrames={AUDIO.techFeed}>
        <Audio src={staticFile('audio/promo/datacube-promo-scene4-tech.mp3')} />
      </Sequence>
      <Sequence from={AUDIO_STARTS.investment} durationInFrames={AUDIO.investment}>
        <Audio src={staticFile('audio/promo/datacube-promo-scene5-investment.mp3')} />
      </Sequence>
      <Sequence from={AUDIO_STARTS.tips} durationInFrames={AUDIO.tips}>
        <Audio src={staticFile('audio/promo/datacube-promo-scene6-tips.mp3')} />
      </Sequence>
      <Sequence from={AUDIO_STARTS.aiFeatures} durationInFrames={AUDIO.aiFeatures}>
        <Audio src={staticFile('audio/promo/datacube-promo-scene7-ai.mp3')} />
      </Sequence>
      <Sequence from={AUDIO_STARTS.stats} durationInFrames={AUDIO.stats}>
        <Audio src={staticFile('audio/promo/datacube-promo-scene8-stats.mp3')} />
      </Sequence>
      <Sequence from={AUDIO_STARTS.cta} durationInFrames={AUDIO.cta}>
        <Audio src={staticFile('audio/promo/datacube-promo-scene9-cta.mp3')} />
      </Sequence>
      <Sequence from={AUDIO_STARTS.endCard} durationInFrames={AUDIO.endCard}>
        <Audio src={staticFile('audio/promo/datacube-promo-scene10-end.mp3')} />
      </Sequence>

      {/* Visual TransitionSeries */}
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={SCENES.hook}>
          <HookScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
        />

        <TransitionSeries.Sequence durationInFrames={SCENES.problem}>
          <ProblemScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
        />

        <TransitionSeries.Sequence durationInFrames={SCENES.brandReveal}>
          <BrandRevealScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-right' })}
          timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
        />

        <TransitionSeries.Sequence durationInFrames={SCENES.techFeed}>
          <TechFeedScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-right' })}
          timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
        />

        <TransitionSeries.Sequence durationInFrames={SCENES.investment}>
          <InvestmentScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-right' })}
          timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
        />

        <TransitionSeries.Sequence durationInFrames={SCENES.tips}>
          <TipsFeedScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
        />

        <TransitionSeries.Sequence durationInFrames={SCENES.aiFeatures}>
          <AIFeaturesScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
        />

        <TransitionSeries.Sequence durationInFrames={SCENES.stats}>
          <StatsScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
        />

        <TransitionSeries.Sequence durationInFrames={SCENES.cta}>
          <CTAScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
        />

        <TransitionSeries.Sequence durationInFrames={SCENES.endCard}>
          <EndCardScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
