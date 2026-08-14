'use client';

import PieChart, { Legend, Series } from 'devextreme-react/pie-chart';

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

export interface DonutChartProps {
  segments: DonutSegment[];
  size?: number;
  tooltip?: React.ReactNode;
}

function customizePoint(arg: { data: DonutSegment }) {
  return { color: arg.data.color };
}

export function DonutChart({ segments, size = 32, tooltip }: DonutChartProps) {
  const visible = segments.filter((s) => s.value > 0);

  if (visible.length === 0) return null;

  return (
    <div className="group/donut relative inline-flex cursor-default">
      <PieChart
        dataSource={visible}
        type="doughnut"
        innerRadius={0.6}
        size={{ width: size, height: size }}
        customizePoint={customizePoint}
        animation={{ enabled: false }}
        redrawOnResize={false}
      >
        <Series argumentField="label" valueField="value" />
        <Legend visible={false} />
      </PieChart>
      {tooltip}
    </div>
  );
}
