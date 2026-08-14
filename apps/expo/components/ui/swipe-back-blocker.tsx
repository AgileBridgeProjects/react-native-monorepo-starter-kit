/**
 * SwipeBackBlocker — Blocks iOS swipe-back gesture.
 *
 * Wraps children in a full-screen GestureDetector that captures horizontal
 * pan gestures anywhere on screen, preventing them from reaching the native
 * iOS back-swipe gesture recognizer.
 *
 * The pan activates after 5px of horizontal movement and consumes the gesture
 * so the navigation controller never sees it.
 */
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

export interface SwipeBackBlockerProps {
  children: React.ReactNode;
}

export function SwipeBackBlocker({ children }: SwipeBackBlockerProps) {
  // Pan gesture that activates after 5px of horizontal movement —
  // this steals the pan from the navigation gesture recognizer
  const blockGesture = Gesture.Pan()
    .activeOffsetX([-5, 5])
    .onStart(() => {
      // intentionally empty — just consume the gesture
    });

  return <GestureDetector gesture={blockGesture}>{children}</GestureDetector>;
}
