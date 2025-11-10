"use client";

import { Card, CardContent } from "./ui/card";

export function SensorCard({
  title,
  value,
  icon: Icon,
  status,
  iconColor = "text-blue-500",
}) {
  return (
    <Card className="hover:shadow-md transition-shadow border-gray-200">
      <CardContent className="p-4">
        <div className="flex flex-col space-y-1">
          <p className="text-xs text-gray-500 font-medium">{title}</p>
          <div className="flex items-center justify-between">
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <div className={iconColor}>
              <Icon size={28} strokeWidth={2} />
            </div>
          </div>
          {status && (
            <span className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-sm w-fit">
              {status}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
