import { Link } from 'expo-router';
import { View } from 'react-native';

import { Typography } from '@/components/ui';

export default function ModalScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background p-md">
      <Typography variant="h2">This is a modal</Typography>
      <Link href="/" dismissTo>
        <Typography variant="body" className="text-primary mt-lg py-md">
          Go to home screen
        </Typography>
      </Link>
    </View>
  );
}
