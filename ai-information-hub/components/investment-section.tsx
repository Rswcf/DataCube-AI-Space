"use client";

import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Building2,
  Briefcase,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  BarChart3,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const vcDeals = [
  {
    id: 1,
    company: "Perplexity AI",
    logo: "P",
    amount: "$520M",
    round: "Series C",
    valuation: "$9B",
    investors: ["Nvidia, Amazon, Bezos Expeditions"],
    sector: "Search & Retrieval",
    change: "+180%",
    positive: true,
  },
  {
    id: 2,
    company: "Mistral AI",
    logo: "M",
    amount: "$640M",
    round: "Series B",
    valuation: "$6.2B",
    investors: ["Andreessen Horowitz, Lightspeed"],
    sector: "Foundation Models",
    change: "+95%",
    positive: true,
  },
  {
    id: 3,
    company: "Cohere",
    logo: "C",
    amount: "$450M",
    round: "Series D",
    valuation: "$5.5B",
    investors: ["Inovia Capital, Nvidia"],
    sector: "Enterprise AI",
    change: "+65%",
    positive: true,
  },
  {
    id: 4,
    company: "Glean",
    logo: "G",
    amount: "$260M",
    round: "Series D",
    valuation: "$4.6B",
    investors: ["Kleiner Perkins, Sequoia"],
    sector: "Enterprise Search",
    change: "+110%",
    positive: true,
  },
];

const publicMarket = [
  {
    id: 1,
    ticker: "NVDA",
    name: "NVIDIA Corporation",
    price: "$892.45",
    change: "+4.2%",
    positive: true,
    marketCap: "$2.2T",
    news: "Record Q4 data center revenue driven by AI chip demand",
  },
  {
    id: 2,
    ticker: "MSFT",
    name: "Microsoft Corporation",
    price: "$428.75",
    change: "+2.1%",
    positive: true,
    marketCap: "$3.18T",
    news: "Azure AI services revenue grows 52% YoY",
  },
  {
    id: 3,
    ticker: "GOOGL",
    name: "Alphabet Inc.",
    price: "$178.30",
    change: "-1.8%",
    positive: false,
    marketCap: "$2.2T",
    news: "Gemini adoption slower than expected in enterprise",
  },
  {
    id: 4,
    ticker: "AMD",
    name: "Advanced Micro Devices",
    price: "$168.90",
    change: "+3.5%",
    positive: true,
    marketCap: "$273B",
    news: "MI300X shipments exceed guidance, competing with Nvidia",
  },
];

const maActivity = [
  {
    id: 1,
    acquirer: "Salesforce",
    target: "Airkit.ai",
    value: "$1.8B",
    rationale: "Enhance customer service AI capabilities",
    status: "Announced",
  },
  {
    id: 2,
    acquirer: "ServiceNow",
    target: "G2K Group",
    value: "$2.85B",
    rationale: "Expand AI-powered IT operations",
    status: "Pending",
  },
];

export function InvestmentSection() {
  const [activeTab, setActiveTab] = useState("vc");

  return (
    <section id="investment" className="border-b border-border bg-secondary/30 py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-12">
          <div className="flex items-center gap-2">
            <div className="h-1 w-8 rounded-full bg-accent" />
            <span className="text-sm font-medium uppercase tracking-wider text-accent">
              Section 02
            </span>
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Investment News
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Primary and secondary market movements in the AI sector, including VC deals, public equities, and M&A activity.
          </p>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-8"
        >
          <TabsList className="grid w-full max-w-md grid-cols-3 bg-secondary">
            <TabsTrigger value="vc" className="gap-2">
              <Briefcase className="h-4 w-4" />
              <span className="hidden sm:inline">VC Deals</span>
              <span className="sm:hidden">VC</span>
            </TabsTrigger>
            <TabsTrigger value="public" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Public Market</span>
              <span className="sm:hidden">Public</span>
            </TabsTrigger>
            <TabsTrigger value="ma" className="gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">M&A</span>
              <span className="sm:hidden">M&A</span>
            </TabsTrigger>
          </TabsList>

          {/* VC Deals Tab */}
          <TabsContent value="vc" className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              {vcDeals.map((deal) => (
                <Card
                  key={deal.id}
                  className="group transition-all hover:border-accent/50"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-lg font-bold text-primary">
                          {deal.logo}
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">
                            {deal.company}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {deal.sector}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`flex items-center gap-1 text-sm font-medium ${
                          deal.positive ? "text-accent" : "text-destructive"
                        }`}
                      >
                        {deal.positive ? (
                          <ArrowUpRight className="h-4 w-4" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4" />
                        )}
                        {deal.change}
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Amount</p>
                        <p className="text-lg font-bold text-foreground">
                          {deal.amount}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Round</p>
                        <p className="font-medium text-foreground">
                          {deal.round}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Valuation
                        </p>
                        <p className="font-medium text-foreground">
                          {deal.valuation}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 border-t border-border pt-4">
                      <p className="text-xs text-muted-foreground">
                        Lead Investors
                      </p>
                      <p className="mt-1 text-sm text-foreground">
                        {deal.investors.join(", ")}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Public Market Tab */}
          <TabsContent value="public" className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-border">
              <div className="hidden grid-cols-6 gap-4 bg-secondary p-4 text-xs font-medium uppercase tracking-wider text-muted-foreground sm:grid">
                <div className="col-span-2">Company</div>
                <div className="text-right">Price</div>
                <div className="text-right">Change</div>
                <div className="text-right">Market Cap</div>
                <div>News</div>
              </div>
              {publicMarket.map((stock, index) => (
                <div
                  key={stock.id}
                  className={`grid grid-cols-2 gap-4 p-4 sm:grid-cols-6 ${
                    index !== publicMarket.length - 1
                      ? "border-b border-border"
                      : ""
                  } transition-colors hover:bg-secondary/50`}
                >
                  <div className="col-span-2 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                      {stock.ticker}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {stock.ticker}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {stock.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-foreground">{stock.price}</p>
                    <p className="text-xs text-muted-foreground sm:hidden">
                      Price
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`flex items-center justify-end gap-1 font-medium ${
                        stock.positive ? "text-accent" : "text-destructive"
                      }`}
                    >
                      {stock.positive ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                      {stock.change}
                    </p>
                    <p className="text-xs text-muted-foreground sm:hidden">
                      Change
                    </p>
                  </div>
                  <div className="hidden text-right sm:block">
                    <p className="font-medium text-foreground">
                      {stock.marketCap}
                    </p>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {stock.news}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* M&A Tab */}
          <TabsContent value="ma" className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              {maActivity.map((deal) => (
                <Card
                  key={deal.id}
                  className="group transition-all hover:border-primary/50"
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className={
                          deal.status === "Announced"
                            ? "border-accent/30 bg-accent/10 text-accent"
                            : "border-primary/30 bg-primary/10 text-primary"
                        }
                      >
                        {deal.status}
                      </Badge>
                      <div className="flex items-center gap-1 text-xl font-bold text-foreground">
                        <DollarSign className="h-5 w-5 text-muted-foreground" />
                        {deal.value}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                        {deal.acquirer.charAt(0)}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {deal.acquirer}
                        </span>
                        <ArrowUpRight className="h-4 w-4" />
                        <span className="font-medium text-foreground">
                          {deal.target}
                        </span>
                      </div>
                    </div>
                    <CardDescription className="mt-4">
                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Strategic Rationale
                      </span>
                      <p className="mt-1 text-foreground">{deal.rationale}</p>
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
