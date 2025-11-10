"use client";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export function HistoricalChart({ data }) {
  return (
    <Card className="border-gray-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">
          Grafik Historis (24 Jam Terakhir)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={data}
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="#999" />
            <YAxis tick={{ fontSize: 11 }} stroke="#999" />
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #ddd",
                borderRadius: "6px",
                fontSize: "12px",
              }}
            />
            <Legend wrapperStyle={{ fontSize: "12px" }} iconType="line" />
            <Line
              type="monotone"
              dataKey="suhu"
              stroke="#ef4444"
              name="Suhu (°C)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="kelembabanUdara"
              stroke="#3b82f6"
              name="Kelembaban Udara (%)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="kelembabanTanah"
              stroke="#22c55e"
              name="Kelembaban Tanah (%)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
