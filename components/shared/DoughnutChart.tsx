"use client";
import React from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
ChartJS.register(ArcElement, Tooltip, Legend);
const DoughnutChart = ({ accounts }: DoughnutChartProps) => {
  const accountsNames = accounts.map((account) => account.name);
  const accountsBalances = accounts.map((account) => account.currentBalance);
  const data = {
    datasets: [
      {
        label: "Banks",
        data: accountsBalances,
        backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56"],
      },
    ],
    labels: accountsNames,
  };

  return (
    <Doughnut
      data={data}
      options={{
        cutout: "60%",
        plugins: {
          legend: {
            display: false,
          },
        },
      }}
    />
  );
};

export default DoughnutChart;
