import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface StoryProgressBarProps {
  index: number;
  currentIndex: number;
  duration: number;
  length: number;
  onComplete: () => void;
  isActive: boolean;
  isPaused: boolean;
}

const StoryProgressBar: React.FC<StoryProgressBarProps> = ({
  index,
  currentIndex,
  duration,
  length,
  onComplete,
  isActive,
  isPaused,
}) => {
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const progressAnimation = useRef(new Animated.Value(0)).current;

  // Start or restart animation when active
  useEffect(() => {
    // If this is the current story, animate
    if (isActive && !isPaused) {
      startAnimation();
    } else if (isActive && isPaused) {
      // Pause animation
      if (animationRef.current) {
        animationRef.current.stop();
      }
    }

    return () => {
      // Clean up animation
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, [isActive, isPaused]);

  // Reset animation if the current index changes
  useEffect(() => {
    if (index < currentIndex) {
      // Set progress to 100% for past stories
      progressAnimation.setValue(1);
    } else if (index > currentIndex) {
      // Set progress to 0% for future stories
      progressAnimation.setValue(0);
    }
  }, [currentIndex, index]);

  const startAnimation = () => {
    // Stop any existing animation
    if (animationRef.current) {
      animationRef.current.stop();
    }

    // Reset animation
    progressAnimation.setValue(0);

    // Log to console for debugging
    console.log(`Starting 10-second timer for story index ${index}`);

    // Create animation
    animationRef.current = Animated.timing(progressAnimation, {
      toValue: 1,
      duration: duration,
      useNativeDriver: false,
    });

    // Start animation
    animationRef.current.start(({ finished }) => {
      if (finished) {
        console.log(`Animation completed for story index ${index}`);
        onComplete();
      }
    });
  };

  return (
    <View style={[styles.container, { width: `${100 / length - 1}%` }]}>
      <View style={styles.background}>
        {index < currentIndex ? (
          // Already viewed
          <View style={styles.progressFull} />
        ) : index === currentIndex ? (
          // Current progress
          <Animated.View
            style={[
              styles.progress,
              {
                width: progressAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 4,
    marginHorizontal: 2,
  },
  background: {
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  progressFull: {
    height: '100%',
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
});

export default StoryProgressBar; 