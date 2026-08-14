import { View } from 'react-native';
import { Skeleton } from '@/components/ui';

export function OrgListSkeleton() {
  return (
    <View className="flex-1 items-center">
      <View className="w-full max-w-auth-form items-center">
        <Skeleton shape="circle" className="mb-lg h-16 w-16" />
        <Skeleton className="mb-sm h-9 w-3/4" />
        <Skeleton className="mb-2xl h-5 w-5/6" />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} shape="card" className="mb-sm h-18 w-full" />
        ))}
      </View>
    </View>
  );
}
