'use client';

import { Header } from '@/components/Header';
import { Spotlight } from '@/components/ui/spotlight';
import { AuroraBackground } from '@/components/ui/aurora-background';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { ArrowRight, Code, Swords, Trophy, Users, BarChart, Zap, CheckCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const features = [
  {
    icon: Code,
    title: "Real-Time Coding",
    description: "Challenge your skills in live coding battles with peers through our advanced real-time collaboration platform."
  },
  {
    icon: Swords,
    title: "Competitive Arena",
    description: "Join matches and solve problems against the clock in a professional environment designed for optimal performance."
  },
  {
    icon: Trophy,
    title: "Climb the Ranks",
    description: "Earn points and prove your coding prowess on the leaderboard with detailed analytics of your performance."
  },
  {
    icon: Users,
    title: "Global Community",
    description: "Connect with developers worldwide and build your professional network through collaborative challenges."
  },
  {
    icon: BarChart,
    title: "Performance Metrics",
    description: "Track your progress with comprehensive analytics and identify areas for professional growth."
  },
  {
    icon: Zap,
    title: "Skill Enhancement",
    description: "Accelerate your career growth by mastering in-demand programming skills through practical challenges."
  }
];

const testimonials = [
  {
    quote: "CodeClash has transformed how our engineering team evaluates technical skills. The platform's real-time challenges provide invaluable insights into problem-solving abilities.",
    author: "Sarah Johnson",
    role: "CTO, TechInnovate",
    avatar: "SJ"
  },
  {
    quote: "As a developer looking to improve, CodeClash offers the perfect balance of challenge and learning. The competitive environment pushes me to write better code faster.",
    author: "Michael Chen",
    role: "Senior Developer, CloudScale",
    avatar: "MC"
  },
  {
    quote: "We've incorporated CodeClash into our hiring process, allowing us to objectively assess candidates' coding abilities in a standardized environment.",
    author: "Alex Rodriguez",
    role: "HR Director, DataSphere",
    avatar: "AR"
  }
];

const benefits = [
  {
    icon: CheckCircle,
    title: "Proven Results",
    description: "93% of users report significant improvement in coding speed and efficiency within 30 days."
  },
  {
    icon: Users,
    title: "Enterprise Ready",
    description: "Customizable private arenas for team building and technical assessments with detailed reporting."
  },
  {
    icon: Clock,
    title: "Time Efficient",
    description: "Quick 30-minute challenges designed to fit into busy professional schedules."
  }
];

const companyLogos = [
  { name: "TechCorp" },
  { name: "DevSphere" },
  { name: "CodeLabs" },
  { name: "ByteWave" },
  { name: "StackInc" }
];

export default function Home() {
  return (
    <div className="flex flex-col min-h-dvh bg-background text-foreground font-body">
      <Header />
      <main className="flex-1 relative overflow-hidden">
        {/* Hero Section with Aurora Background */}
        <section className="relative w-full overflow-hidden py-20">
          <div className="absolute inset-0 z-0">
            <AuroraBackground showRadialGradient={true} className="h-full">
              <div className="hidden">Aurora</div>
            </AuroraBackground>
          </div>

          <Spotlight
            className="-top-40 left-0 md:-top-20 md:left-60"
            fill="hsl(var(--primary))"
          />

          <div className="relative z-10 container mx-auto px-4 py-20 md:py-32 flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="md:w-1/2 text-left">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
                  Elevate Your <br />
                  <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent inline-block">
                    Coding Skills
                  </span>
                </h1>
              </motion.div>
              
              <motion.p 
                className="mt-6 max-w-xl text-lg text-muted-foreground"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                CodeClash provides a professional platform for developers to enhance their skills through competitive, real-time coding challenges. Perfect for individuals and enterprises seeking technical excellence.
              </motion.p>
              
              <motion.div 
                className="mt-8 flex flex-col sm:flex-row items-start gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <Button size="lg" className="text-lg px-8 py-6 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/30 transition-all duration-300 hover:shadow-primary/50 w-full sm:w-auto group" asChild>
                  <Link href="/lobby">
                    Start a Challenge
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
                
                <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-primary/30 hover:bg-primary/10 transition-all duration-300 w-full sm:w-auto group" asChild>
                  <Link href="/leaderboard">
                    View Leaderboard
                    <Trophy className="ml-2 h-5 w-5 transition-transform group-hover:translate-y-[-2px]" />
                  </Link>
                </Button>
              </motion.div>
              
              <motion.div
                className="mt-8 flex items-center gap-2 text-sm text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                <CheckCircle className="h-4 w-4 text-primary" />
                <span>Trusted by 500+ companies worldwide</span>
              </motion.div>
            </div>
            
            <motion.div 
              className="md:w-1/2 relative"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7 }}
            >
              <div className="relative w-full aspect-square max-w-md mx-auto">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-3xl blur-3xl" />
                <div className="relative z-10 w-full h-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black/20 backdrop-blur-sm p-4">
                  <div className="h-6 w-full flex items-center gap-1.5 mb-4">
                    <div className="h-3 w-3 rounded-full bg-red-500" />
                    <div className="h-3 w-3 rounded-full bg-yellow-500" />
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                    <div className="ml-4 h-full w-64 rounded-md bg-white/10" />
                  </div>
                  <div className="space-y-3">
                    <div className="h-4 w-3/4 rounded-md bg-white/10" />
                    <div className="h-4 w-full rounded-md bg-white/10" />
                    <div className="h-4 w-5/6 rounded-md bg-white/10" />
                    <div className="h-4 w-2/3 rounded-md bg-primary/30" />
                    <div className="h-4 w-full rounded-md bg-white/10" />
                    <div className="h-4 w-3/4 rounded-md bg-white/10" />
                    <div className="h-4 w-4/5 rounded-md bg-accent/30" />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Section with Glassmorphism */}
        <section className="py-24 relative bg-gradient-to-b from-background via-background/95 to-background">
          <div className="container mx-auto px-4 relative z-10">
            <motion.div 
              className="text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                Why Leading Companies Choose <span className="text-primary">CodeClash</span>
              </h2>
              <p className="mt-4 text-lg text-muted-foreground max-w-3xl mx-auto">
                Our enterprise-grade platform delivers measurable improvements in coding proficiency and technical assessment capabilities.
              </p>
            </motion.div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {features.slice(0, 3).map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -5 }}
                  className="group"
                >
                  <div className="h-full p-8 rounded-2xl backdrop-blur-md bg-card/30 border border-border/50 shadow-lg transition-all duration-300 group-hover:shadow-primary/20 group-hover:border-primary/30">
                    <div className="p-4 bg-primary/10 rounded-full mb-6 w-16 h-16 flex items-center justify-center ring-2 ring-inset ring-primary/20">
                      <feature.icon className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
            
            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
              {features.slice(3, 6).map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 + 0.3 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -5 }}
                  className="group"
                >
                  <div className="h-full p-8 rounded-2xl backdrop-blur-md bg-card/30 border border-border/50 shadow-lg transition-all duration-300 group-hover:shadow-primary/20 group-hover:border-primary/30">
                    <div className="p-4 bg-primary/10 rounded-full mb-6 w-16 h-16 flex items-center justify-center ring-2 ring-inset ring-primary/20">
                      <feature.icon className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
        
        {/* Testimonials Section */}
        <section className="py-24 relative bg-gradient-to-b from-background to-background/90">
          <div className="container mx-auto px-4">
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <div className="inline-block mb-4">
                <div className="px-4 py-2 bg-primary/10 backdrop-blur-sm rounded-full border border-primary/20 text-primary">
                  <span className="text-sm font-medium">Enterprise-Grade Solution</span>
                </div>
              </div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-white via-primary/80 to-white">
                Trusted by Industry Leaders
              </h2>
              <p className="mt-6 text-lg text-muted-foreground max-w-3xl mx-auto">
                Leading organizations rely on CodeClash to transform their technical assessment processes and accelerate developer skill development.
              </p>
            </motion.div>
            
            {/* Logos Section */}
            <motion.div 
              className="flex flex-wrap justify-center items-center gap-8 md:gap-16 mb-20"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              {companyLogos.map((company, index) => (
                <div key={index} className="h-12 w-32 bg-white/5 backdrop-blur-sm rounded-lg flex items-center justify-center border border-white/10 px-6 py-3 hover:bg-white/10 transition-colors">
                  <div className="text-xl font-bold text-white/40">{company.name}</div>
                </div>
              ))}
            </motion.div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <motion.div
                  key={testimonial.author}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="group"
                >
                  <Card className="h-full backdrop-blur-md bg-card/30 border border-white/10 shadow-xl transition-all duration-300 group-hover:shadow-primary/20 group-hover:border-primary/30 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent" />
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12 border-2 border-white/10">
                          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-white">
                            {testimonial.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">{testimonial.author}</CardTitle>
                          <CardDescription>{testimonial.role}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-2 text-4xl text-primary/50">"</div>
                      <p className="italic text-muted-foreground">{testimonial.quote}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-24 relative bg-gradient-to-b from-background/90 to-background">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
              >
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-6">
                  Measurable Results for <br />
                  <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent inline-block">
                    Teams & Individuals
                  </span>
                </h2>
                <p className="text-lg text-muted-foreground mb-8 max-w-xl">
                  Our platform delivers quantifiable improvements in coding efficiency, problem-solving capabilities, and technical assessment accuracy.
                </p>
                
                <div className="space-y-6">
                  {benefits.map((benefit, index) => (
                    <motion.div 
                      key={benefit.title}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      viewport={{ once: true }}
                      className="flex items-start gap-4"
                    >
                      <div className="p-2 bg-primary/10 rounded-full flex-shrink-0 ring-1 ring-inset ring-primary/20">
                        <benefit.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold mb-1">{benefit.title}</h3>
                        <p className="text-muted-foreground">{benefit.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="absolute -inset-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-3xl blur-2xl" />
                <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                  <div className="aspect-[4/3] bg-gradient-to-br from-black/50 to-black/20 backdrop-blur-sm p-8 flex items-center justify-center">
                    <div className="w-full max-w-md">
                      <div className="w-full h-8 bg-white/5 rounded-lg mb-6 flex items-center px-3">
                        <div className="w-3/4 h-3 bg-primary/40 rounded-full" />
                      </div>
                      <div className="space-y-4">
                        <div className="h-32 w-full bg-white/5 rounded-lg flex items-center justify-center p-4">
                          <div className="w-full h-full rounded-md bg-gradient-to-r from-primary/20 to-accent/20 flex items-center justify-center">
                            <BarChart className="h-12 w-12 text-primary/70" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="h-24 bg-white/5 rounded-lg p-4">
                            <div className="h-3 w-1/2 bg-white/20 rounded-full mb-2" />
                            <div className="h-8 w-full bg-primary/20 rounded-md" />
                          </div>
                          <div className="h-24 bg-white/5 rounded-lg p-4">
                            <div className="h-3 w-1/2 bg-white/20 rounded-full mb-2" />
                            <div className="h-8 w-full bg-accent/20 rounded-md" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 relative">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="container mx-auto px-4"
          >
            <div className="bg-gradient-to-r from-primary/20 to-accent/20 rounded-3xl p-8 md:p-12 backdrop-blur-sm border border-white/10 shadow-xl relative overflow-hidden">
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="text-center md:text-left">
                  <motion.h2 
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    viewport={{ once: true }}
                    className="text-3xl md:text-4xl font-bold tracking-tight"
                  >
                    Ready to elevate your technical team?
                  </motion.h2>
                  <motion.p 
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    viewport={{ once: true }}
                    className="mt-4 text-lg text-muted-foreground max-w-2xl"
                  >
                    Join leading companies using CodeClash for technical assessment, skill development, and team building. Start with a free enterprise trial today.
                  </motion.p>
                </div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.05 }}
                  className="flex flex-col sm:flex-row gap-4"
                >
                  <Button size="lg" className="text-lg px-8 py-6 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/30 transition-all duration-300 hover:shadow-primary/50 whitespace-nowrap" asChild>
                    <Link href="/enterprise">
                      Request Demo
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                  
                  <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-primary/30 hover:bg-primary/10 transition-all duration-300 whitespace-nowrap" asChild>
                    <Link href="/lobby">
                      Start Free Trial
                    </Link>
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </section>
      </main>
    </div>
  );
}
