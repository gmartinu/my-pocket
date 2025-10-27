import React, { useEffect } from 'react';
import { Pressable, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { FAB as PaperFAB, Card as PaperCard } from 'react-native-paper';

// Animated Pressable Card with scale effect
interface AnimatedCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  mode?: 'elevated' | 'contained' | 'outlined';
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({ children, onPress, style, mode }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  if (!onPress) {
    return (
      <PaperCard style={style} mode={mode}>
        {children}
      </PaperCard>
    );
  }

  return (
    <Animated.View style={[animatedStyle, style]}>
      <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={onPress}>
        <PaperCard mode={mode}>{children}</PaperCard>
      </Pressable>
    </Animated.View>
  );
};

// Animated Progress Bar
interface AnimatedProgressBarProps {
  progress: number; // 0 to 1
  height?: number;
  backgroundColor?: string;
  progressColor?: string;
  borderRadius?: number;
}

export const AnimatedProgressBar: React.FC<AnimatedProgressBarProps> = ({
  progress,
  height = 8,
  backgroundColor = '#E0E0E0',
  progressColor = '#4CAF50',
  borderRadius = 4,
}) => {
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withSpring(progress, {
      damping: 15,
      stiffness: 100,
    });
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => {
    const width = interpolate(
      animatedProgress.value,
      [0, 1],
      [0, 100],
      Extrapolate.CLAMP
    );

    return {
      width: `${width}%`,
    };
  });

  return (
    <Animated.View
      style={{
        height,
        backgroundColor,
        borderRadius,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={[
          {
            height: '100%',
            backgroundColor: progressColor,
            borderRadius,
          },
          animatedStyle,
        ]}
      />
    </Animated.View>
  );
};

// Animated FAB with rotate effect
interface AnimatedFABProps {
  icon: string;
  onPress: () => void;
  isOpen?: boolean;
  label?: string;
  style?: ViewStyle;
}

export const AnimatedFAB: React.FC<AnimatedFABProps> = ({
  icon,
  onPress,
  isOpen = false,
  label,
  style,
}) => {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    rotation.value = withSpring(isOpen ? 45 : 0, { damping: 15 });
  }, [isOpen]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
    ],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  const handlePress = () => {
    handlePressOut();
    onPress();
  };

  return (
    <Animated.View style={[animatedStyle, style]}>
      <PaperFAB
        icon={icon}
        onPress={handlePress}
        label={label}
      />
    </Animated.View>
  );
};

// Fade In Animation
interface FadeInViewProps {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  style?: ViewStyle;
}

export const FadeInView: React.FC<FadeInViewProps> = ({
  children,
  duration = 500,
  delay = 0,
  style,
}) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    setTimeout(() => {
      opacity.value = withTiming(1, { duration });
      translateY.value = withTiming(0, { duration });
    }, delay);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
};

// Pulse Animation (for highlighting new items)
interface PulseViewProps {
  children: React.ReactNode;
  shouldPulse?: boolean;
  style?: ViewStyle;
}

export const PulseView: React.FC<PulseViewProps> = ({
  children,
  shouldPulse = false,
  style,
}) => {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (shouldPulse) {
      scale.value = withRepeat(
        withTiming(1.05, { duration: 500 }),
        4,
        true
      );
    } else {
      scale.value = withTiming(1, { duration: 200 });
    }
  }, [shouldPulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
};

// Slide In From Right
interface SlideInViewProps {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  style?: ViewStyle;
}

export const SlideInView: React.FC<SlideInViewProps> = ({
  children,
  duration = 400,
  delay = 0,
  style,
}) => {
  const translateX = useSharedValue(300);
  const opacity = useSharedValue(0);

  useEffect(() => {
    setTimeout(() => {
      translateX.value = withSpring(0, { damping: 20 });
      opacity.value = withTiming(1, { duration: duration / 2 });
    }, delay);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
};

// Bounce Animation
interface BounceViewProps {
  children: React.ReactNode;
  trigger?: boolean;
  style?: ViewStyle;
}

export const BounceView: React.FC<BounceViewProps> = ({
  children,
  trigger = false,
  style,
}) => {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (trigger) {
      scale.value = withSpring(1.2, { damping: 5 });
      setTimeout(() => {
        scale.value = withSpring(1, { damping: 10 });
      }, 200);
    }
  }, [trigger]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
};
