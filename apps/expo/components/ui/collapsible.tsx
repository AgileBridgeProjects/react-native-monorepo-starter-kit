import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Typography } from '@/components/ui/typography';
import { colors, iconSize } from '@/constants/tokens';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { cn } from '@/src/lib/cn';

interface CollapsibleProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function Collapsible({ children, title, className }: CollapsibleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const colorScheme = (useColorScheme() ?? 'light') as keyof typeof colors;

  return (
    <View className={cn('mb-md', className)}>
      <Pressable
        className="flex-row items-center gap-xs active:opacity-80"
        onPress={() => setIsOpen((value) => !value)}
      >
        <IconSymbol
          name="chevron.right"
          size={iconSize.sm}
          color={colors[colorScheme].icon}
          style={{ transform: [{ rotate: isOpen ? '90deg' : '0deg' }] }}
        />
        <Typography variant="body" className="font-semibold">
          {title}
        </Typography>
      </Pressable>
      {isOpen && <View className="mt-xs ml-lg">{children}</View>}
    </View>
  );
}
