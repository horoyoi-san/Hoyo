"use client"

import { useAuth } from "@/components/auth/auth-provider"
import { useRouter } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import AnimatedBackground from "@/components/ui/animated-background"
import {
  Cloud,
  Shield,
  Zap,
  ArrowRight,
  CheckCircle,
  Upload,
  Download,
  Users,
  Globe,
  Star,
  Sparkles,
  Github,
  X,
  MessageSquare,
  FileText
} from "lucide-react"

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [showManifesto, setShowManifesto] = useState(false)
  const [scrollY, setScrollY] = useState(0)
  const [blurAmount, setBlurAmount] = useState(0)
  const [overlayOpacity, setOverlayOpacity] = useState(0)
  const firstPageRef = useRef<HTMLElement>(null)
  const secondPageRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard")
    }
  }, [user, loading, router])

  // 滚动监听和过渡效果计算
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      setScrollY(currentScrollY)
      
      // 计算第一页的高度
      const firstPageHeight = firstPageRef.current?.offsetHeight || window.innerHeight
      
      // 更平滑的过渡计算
      // 从第一页30%开始轻微过渡，70%时达到完全效果
      const startTransition = firstPageHeight * 0.3
      const endTransition = firstPageHeight * 0.9
      
      // 计算过渡进度 (0-1)
      const scrollProgress = Math.min(Math.max((currentScrollY - startTransition) / (endTransition - startTransition), 0), 1)
      
      // 使用 easeInOut 缓动函数使过渡更自然
      const easeInOut = (t: number) => t * t * (3 - 2 * t)
      const smoothProgress = easeInOut(scrollProgress)
      
      // 计算模糊程度 (0-15px，减少最大模糊度)
      const newBlurAmount = smoothProgress * 15
      setBlurAmount(newBlurAmount)
      
      // 计算叠加层透明度 (0-0.8)
      const newOverlayOpacity = smoothProgress * 0.8
      setOverlayOpacity(newOverlayOpacity)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // 创建粒子效果
  useEffect(() => {
    const particlesContainer = document.getElementById('particles')
    if (!particlesContainer) return

    const particleCount = 50
    particlesContainer.innerHTML = '' // 清空现有粒子

    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div')
      particle.className = 'particle'
      particle.style.cssText = `
        position: absolute;
        width: 2px;
        height: 2px;
        background: rgba(255, 255, 255, 0.5);
        border-radius: 50%;
        left: ${Math.random() * 100}%;
        animation: particleFloat ${Math.random() * 3 + 5}s linear infinite;
        animation-delay: ${Math.random() * 8}s;
      `
      particlesContainer.appendChild(particle)
    }
  }, [])

  // 平滑滚动到指定页面
  const scrollToPage = (pageRef: React.RefObject<HTMLElement>) => {
    pageRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    })
  }

  // 跳转到GitHub仓库
  const openGitHub = () => {
    window.open('https://github.com/ChuxinNeko/FireflyCloud', '_blank')
  }

  // 打开QQ群
  const openQQGroup = () => {
    window.open('https://qm.qq.com/q/YI2nXdHvYA', '_blank')
  }

  // 打开部署文档
  const openDocs = () => {
    window.open('https://build.cyrene.cyou/', '_blank')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    )
  }

  if (user) {
    return null
  }

  return (
    <>
      <style jsx global>{`
        @keyframes particleFloat {
          0% {
            transform: translateY(100vh) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-10vh) rotate(360deg);
            opacity: 0;
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes shine {
          0% {
            transform: translateX(-100%);
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translateX(200%);
            opacity: 0;
          }
        }

        .floating {
          animation: float 3s ease-in-out infinite;
          position: relative;
          z-index: 10;
        }

        .shine::after {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.3),
            transparent
          );
          animation: shine 2s ease-in-out infinite;
        }

        .glass-effect {
          background: hsla(0, 0%, 100%, 0.1);
          backdrop-filter: blur(12px);
          border: 1px solid hsla(0, 0%, 100%, 0.2);
          box-shadow: 
            inset 0 0 1px 1px rgba(255, 255, 255, 0.05),
            inset 0 0 2px 1px rgba(255, 255, 255, 0.2),
            0 0 10px 0 rgba(255, 255, 255, 0.1);
        }

        .glass-card {
          background: hsla(0, 0%, 100%, 0.05);
          backdrop-filter: blur(8px);
          border: 1px solid hsla(0, 0%, 100%, 0.1);
        }

        .feature-card {
          animation: fadeInUp 1s ease-out;
          animation-fill-mode: both;
        }

        .feature-card:nth-child(1) { animation-delay: 0.1s; }
        .feature-card:nth-child(2) { animation-delay: 0.2s; }
        .feature-card:nth-child(3) { animation-delay: 0.3s; }
        .feature-card:nth-child(4) { animation-delay: 0.4s; }
        .feature-card:nth-child(5) { animation-delay: 0.5s; }
        .feature-card:nth-child(6) { animation-delay: 0.6s; }

        .animated-background {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100vh;
          z-index: -3;
          transition: filter 0.6s ease;
        }

        .dynamic-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100vh;
          z-index: -2;
          background: linear-gradient(
            180deg,
            rgba(0, 0, 0, 0) 0%,
            rgba(0, 0, 0, 0.3) 50%,
            rgba(0, 0, 0, 0.9) 100%
          );
          transition: opacity 0.6s ease;
          pointer-events: none;
        }

        .noise-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100vh;
          z-index: -1;
          background-image: url('data:image/png;base64,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');
          background-repeat: repeat;
          opacity: 0.2;
          pointer-events: none;
          transition: opacity 0.6s ease;
        }

        .particles {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100vh;
          pointer-events: none;
          z-index: 1;
          transition: opacity 0.6s ease;
        }

        .page-section {
          min-height: 100vh;
          position: relative;
        }

        .seamless-transition {
          background: transparent;
          position: relative;
        }

        .content-overlay {
          position: relative;
          z-index: 2;
        }

        body {
          overflow-x: hidden;
        }

        html {
          scroll-behavior: smooth;
        }

        .scroll-indicator {
          position: absolute;
          bottom: 2rem;
          left: 50%;
          transform: translateX(-50%);
          opacity: 0.7;
          transition: opacity 0.3s ease;
          z-index: 10;
        }

        .scroll-indicator:hover {
          opacity: 1;
        }

        /* 确保所有容器不会溢出 */
        .container {
          max-width: 100%;
          overflow-x: hidden;
        }

        /* 移动端文本适配 */
        @media (max-width: 768px) {
          .animated-background {
            height: 100vh;
          }
          .dynamic-overlay {
            height: 100vh;
          }
          .noise-overlay {
            height: 100vh;
          }
          .particles {
            height: 100vh;
          }
          
          /* 移动端标题适配 */
          h1 {
            word-break: keep-all;
            overflow-wrap: break-word;
          }
          
          /* 移动端按钮适配 */
          .mobile-btn {
            min-width: 0;
            flex-shrink: 1;
          }
          
          /* 移动端文本适配 */
          .mobile-text {
            word-break: break-word;
            overflow-wrap: break-word;
            hyphens: auto;
          }

          /* 移动端页脚链接适配 */
          .mobile-footer-link {
            width: 100%;
            justify-content: flex-start;
            text-align: left;
            padding: 0.5rem 0;
            font-size: 0.875rem;
          }
        }
      `}</style>

      <div className="min-h-screen text-white relative overflow-x-hidden">
        {/* 动画背景 - 固定定位，根据滚动动态模糊 */}
        <div 
          className="animated-background"
          style={{ 
            filter: `blur(${blurAmount}px)`,
          }}
        >
          <AnimatedBackground />
        </div>

        {/* 动态叠加层 - 创建平滑的渐变过渡 */}
        <div 
          className="dynamic-overlay"
          style={{ 
            opacity: overlayOpacity,
          }}
        ></div>

        {/* 噪点叠加层 */}
        <div 
          className="noise-overlay"
          style={{ 
            opacity: blurAmount > 8 ? 0.1 : 0.2,
          }}
        ></div>

        {/* 粒子效果 - 第一页可见 */}
        <div 
          className="particles" 
          id="particles"
          style={{ 
            opacity: Math.max(0, 1 - (blurAmount / 10)),
          }}
        ></div>

        {/* Navigation - 固定导航 */}
        <header className="fixed top-0 left-0 right-0 z-50 w-full glass-effect">
          <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
              <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm flex-shrink-0">
                <Cloud className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
              </div>
              <span className="font-bold text-lg sm:text-xl text-white truncate">FireflyCloud</span>
            </div>
            <nav className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
              <Button 
                variant="ghost" 
                className="text-white border-white/20 hover:bg-white/10 hover:text-white glass-effect text-sm sm:text-base px-3 sm:px-4 mobile-btn"
                onClick={() => router.push("/login")}
              >
                เข้าสู่ระบบ
              </Button>
              <Button 
                className="bg-white/20 text-white border-white/30 hover:bg-white/30 hover:text-white shine relative overflow-hidden glass-effect text-sm sm:text-base px-3 sm:px-4 mobile-btn"
                onClick={() => router.push("/register")}
              >
                <span className="hidden sm:inline">ลงทะเบียน</span>ฟรี
              </Button>
            </nav>
          </div>
        </header>

        {/* 第一页 - Hero Section */}
        <section ref={firstPageRef} className="page-section flex items-center justify-center relative">
          <div className="container mx-auto px-4 sm:px-6 text-center content-overlay">
            <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 py-8 sm:py-12">
              <Badge 
                variant="outline" 
                className="mb-4 sm:mb-6 glass-effect text-white border-white/30 floating text-xs sm:text-sm"
                style={{animationDelay: '0.1s'}}
              >
                <Sparkles className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                การจัดเก็บข้อมูลบนคลาวด์ที่ทันสมัย
              </Badge>

              <h1 
                className="text-4xl sm:text-6xl md:text-8xl font-bold text-white mb-6 sm:mb-8 floating mobile-text"
                style={{
                  fontFamily: "'Microsoft YaHei', '微软雅黑', sans-serif",
                  animationDelay: '0.2s',
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.5), 0 0 10px rgba(0, 0, 0, 0.3)'
                }}
              >
                FireflyCloud
              </h1>

              <p 
                className="text-lg sm:text-xl md:text-2xl text-white/90 max-w-3xl mx-auto leading-relaxed mb-8 sm:mb-12 mobile-text px-4"
                style={{
                  animationDelay: '0.4s', 
                  animation: 'fadeInUp 1s ease-out 0.4s both',
                  textShadow: '0 1px 3px rgba(0, 0, 0, 0.4)'
                }}
              >
                แพลตฟอร์มการจัดเก็บข้อมูลบนคลาวด์ที่รองรับนโยบายต่างๆ มากมาย มอบประสบการณ์การจัดการไฟล์ที่ปลอดภัย รวดเร็ว และเชื่อถือได้สำหรับบุคคลและทีมงาน
              </p>

              <div 
                className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 px-4"
                style={{animationDelay: '0.6s', animation: 'fadeInUp 1s ease-out 0.6s both'}}
              >
                <Button 
                  size="lg"
                  className="w-full sm:w-auto bg-white/30 text-white border-white/40 hover:bg-white/40 hover:text-white shine relative overflow-hidden glass-effect px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg rounded-full mobile-btn"
                  onClick={() => router.push("/register")}
                  style={{ 
                    textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)',
                    backdropFilter: 'blur(8px)',
                    backgroundColor: 'rgba(0, 0, 0, 0.25)'
                  }}
                >
                  เริ่มต้นเลยตอนนี้
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                  className="w-full sm:w-auto text-white border-white/50 hover:bg-white/20 hover:text-white glass-effect px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg rounded-full mobile-btn"
                  onClick={openGitHub}
                  style={{ 
                    textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)',
                    backdropFilter: 'blur(8px)',
                    backgroundColor: 'rgba(0, 0, 0, 0.2)'
                  }}
                >
                  <Github className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  GitHub
                </Button>
              </div>
            </div>
          </div>

          {/* 滚动指示器 */}
          <div className="scroll-indicator">
            <Button
              variant="ghost"
              size="sm"
              className="text-white/70 hover:text-white glass-effect rounded-full"
              onClick={() => scrollToPage(secondPageRef)}
            >
              <ArrowRight className="h-4 w-4 rotate-90" />
            </Button>
          </div>
        </section>

        {/* 第二页 - Features Section */}
        <section ref={secondPageRef} className="page-section seamless-transition relative">
          <div className="container mx-auto px-4 sm:px-6 py-16 sm:py-24 content-overlay">
            <div className="text-center mb-12 sm:mb-16">
              <h2 
                className="text-3xl sm:text-4xl md:text-6xl font-bold text-white mb-4 sm:mb-6 mobile-text"
                style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.5), 0 0 8px rgba(0, 0, 0, 0.3)' }}
              >
                เหตุใดจึงควรเลือก FireflyCloud？
              </h2>
              <p 
                className="text-lg sm:text-xl text-white/80 max-w-3xl mx-auto mobile-text px-4"
                style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.4)' }}
              >
                เราให้บริการจัดเก็บข้อมูลบนคลาวด์ระดับองค์กรเพื่อให้การจัดการข้อมูลของคุณง่ายดายและมีประสิทธิภาพ
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
              <Card className="glass-card border-white/20 text-white feature-card">
                <CardHeader className="text-center">
                  <div className="flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm mx-auto mb-4">
                    <Cloud className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                  </div>
                  <CardTitle 
                    className="text-xl sm:text-2xl text-white"
                    style={{ textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)' }}
                  >ระบบจัดเก็บข้อมูลแบบคู่</CardTitle>
                  <CardDescription 
                    className="text-white/70 text-sm sm:text-base mobile-text"
                    style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)' }}
                  >
                    ตัวเลือกที่ยืดหยุ่นของการจัดเก็บข้อมูลภายในเครื่องหรือการจัดเก็บข้อมูลบนคลาวด์ Cloudflare R2 สลับได้อย่างราบรื่นตามความต้องการ รับประกันความปลอดภัยและความน่าเชื่อถือของข้อมูล  
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center space-x-2 text-sm">
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-400" />
                    <span className="text-white/90">支持热切换</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-white/20 text-white feature-card">
                <CardHeader className="text-center">
                  <div className="flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm mx-auto mb-4">
                    <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                  </div>
                  <CardTitle 
                    className="text-xl sm:text-2xl text-white"
                    style={{ textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)' }}
                  >安全访问</CardTitle>
                  <CardDescription 
                    className="text-white/70 text-sm sm:text-base mobile-text"
                    style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)' }}
                  >
                    基于角色的访问控制，支持管理员和用户权限管理，采用行业标准加密技术保护数据
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center space-x-2 text-sm">
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-400" />
                    <span className="text-white/90">企业级安全</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-white/20 text-white feature-card">
                <CardHeader className="text-center">
                  <div className="flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm mx-auto mb-4">
                    <Zap className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                  </div>
                  <CardTitle 
                    className="text-xl sm:text-2xl text-white"
                    style={{ textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)' }}
                  >快速可靠</CardTitle>
                  <CardDescription 
                    className="text-white/70 text-sm sm:text-base mobile-text"
                    style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)' }}
                  >
                    采用现代化技术架构，提供高性能文件传输，支持大文件上传下载，稳定可靠
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center space-x-2 text-sm">
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-400" />
                    <span className="text-white/90">高速传输</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Additional Features */}
        <section className="py-16 sm:py-24 relative seamless-transition">
          <div className="container mx-auto px-4 sm:px-6 content-overlay">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 max-w-6xl mx-auto">
              <div className="flex flex-col items-center space-y-3 sm:space-y-4 text-center feature-card">
                <div className="flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-2xl glass-effect">
                  <Upload className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                </div>
                <h3 
                  className="font-semibold text-lg sm:text-xl text-white"
                  style={{ textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)' }}
                >快速上传</h3>
                <p 
                  className="text-white/70 text-sm sm:text-base mobile-text"
                  style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)' }}
                >支持拖拽上传，批量处理</p>
              </div>
              <div className="flex flex-col items-center space-y-3 sm:space-y-4 text-center feature-card">
                <div className="flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-2xl glass-effect">
                  <Download className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                </div>
                <h3 
                  className="font-semibold text-lg sm:text-xl text-white"
                  style={{ textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)' }}
                >便捷下载</h3>
                <p 
                  className="text-white/70 text-sm sm:text-base mobile-text"
                  style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)' }}
                >一键下载，支持断点续传</p>
              </div>
              <div className="flex flex-col items-center space-y-3 sm:space-y-4 text-center feature-card">
                <div className="flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-2xl glass-effect">
                  <Users className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                </div>
                <h3 
                  className="font-semibold text-lg sm:text-xl text-white"
                  style={{ textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)' }}
                >团队协作</h3>
                <p 
                  className="text-white/70 text-sm sm:text-base mobile-text"
                  style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)' }}
                >多用户管理，权限控制</p>
              </div>
              <div className="flex flex-col items-center space-y-3 sm:space-y-4 text-center feature-card">
                <div className="flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-2xl glass-effect">
                  <Globe className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                </div>
                <h3 
                  className="font-semibold text-lg sm:text-xl text-white"
                  style={{ textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)' }}
                >全球访问</h3>
                <p 
                  className="text-white/70 text-sm sm:text-base mobile-text"
                  style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)' }}
                >CDN 加速，全球可达</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 sm:py-32 relative seamless-transition">
          <div className="container mx-auto px-4 sm:px-6 text-center content-overlay">
            <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
              <h2 
                className="text-3xl sm:text-4xl md:text-6xl font-bold text-white mb-4 sm:mb-6 mobile-text"
                style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.5), 0 0 8px rgba(0, 0, 0, 0.3)' }}
              >
                准备开始使用了吗？
              </h2>
              <p 
                className="text-lg sm:text-xl text-white/80 max-w-3xl mx-auto mb-8 sm:mb-12 mobile-text px-4"
                style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.4)' }}
              >
                立即注册，享受专业的云存储服务，让文件管理变得简单高效
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 px-4">
                <Button 
                  size="lg"
                  className="w-full sm:w-auto bg-white/20 text-white border-white/30 hover:bg-white/30 hover:text-white shine relative overflow-hidden glass-effect px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg rounded-full mobile-btn"
                  onClick={() => router.push("/register")}
                >
                  免费开始使用
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                  className="w-full sm:w-auto text-white border-white/40 hover:bg-white/10 hover:text-white glass-effect px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg rounded-full mobile-btn"
                  onClick={() => router.push("/login")}
                >
                  登录现有账户
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 sm:py-16 border-t border-white/20 relative seamless-transition">
          <div className="container mx-auto px-4 sm:px-6 content-overlay">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
              {/* 品牌信息 */}
              <div className="space-y-4 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start space-x-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 flex-shrink-0">
                    <Cloud className="h-5 w-5 text-white" />
                  </div>
                  <span className="font-bold text-white text-lg">FireflyCloud</span>
                </div>
                <p className="text-white/70 text-sm leading-relaxed mobile-text">
                  การจัดเก็บข้อมูลบนคลาวด์ที่ทันสมัยซึ่งมอบการจัดการไฟล์ที่ปลอดภัย รวดเร็ว และเชื่อถือได้สำหรับบุคคลและทีมงาน
                </p>
                <div className="flex items-center justify-center md:justify-start space-x-2">
                  <Badge variant="outline" className="text-white border-white/30 glass-effect text-xs">
                    <Star className="mr-1 h-3 w-3" />
                    企业级
                  </Badge>
                </div>
              </div>

              {/* 快速链接 */}
              <div className="space-y-4 text-center md:text-left">
                <h3 className="font-semibold text-white text-lg">快速链接</h3>
                <div className="space-y-2 sm:space-y-3">
                  <Button
                    variant="ghost"
                    className="text-white/70 hover:text-white hover:bg-white/10 mobile-footer-link text-sm sm:text-base"
                    onClick={openGitHub}
                  >
                    <Github className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span className="mobile-text">GitHub 仓库</span>
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-white/70 hover:text-white hover:bg-white/10 mobile-footer-link text-sm sm:text-base"
                    onClick={openDocs}
                  >
                    <FileText className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span className="mobile-text">部署文档</span>
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-white/70 hover:text-white hover:bg-white/10 mobile-footer-link text-sm sm:text-base"
                    onClick={openQQGroup}
                  >
                    <MessageSquare className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span className="mobile-text">QQ 交流群</span>
                  </Button>
                </div>
              </div>

              {/* 项目信息 */}
              
            </div>

            {/* 底部版权信息 */}
            <div className="border-t border-white/10 pt-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-white/60 text-sm text-center md:text-left mobile-text">
                  © 2025 ChuxinNeko · Made with ❤️ by Morax
                </div>
                <div className="flex items-center space-x-4 text-sm text-white/60">
                  <span>开源软件</span>
                  <span>·</span>
                  <span>MIT 许可证</span>
                </div>
              </div>
            </div>
          </div>
        </footer>

        {/* 宣言模态框 */}
        {showManifesto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md px-4">
            <div className="glass-effect rounded-3xl p-6 sm:p-8 max-w-2xl max-h-[80vh] overflow-y-auto m-4 relative w-full">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-white mobile-text">我们的愿景</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/10 rounded-full w-8 h-8 p-0 flex-shrink-0"
                  onClick={() => setShowManifesto(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <article className="text-white/90 space-y-4 text-sm sm:text-base leading-relaxed mobile-text" style={{fontStyle: 'italic'}}>
                <p>
                  "我们站在新时代的最前沿，在这里创造力与技术相遇，重新定义可能性。我们的使命是为个人和企业提供突破性的云存储解决方案，激发变革并推动进步。"
                </p>
                <p>
                  "我们相信持续创新，突破界限，创造不仅仅是工具，更是变革催化剂的产品。我们重视简洁性，设计直观的体验，让复杂的数据管理变得轻松愉快。"
                </p>
                <p>
                  "我们对可持续发展的承诺驱使我们在提供卓越价值的同时保护数据安全。我们促进协作，建立一个由思想家、创造者和实干家组成的社区，他们都怀着对美好数字未来的共同愿景。"
                </p>
                <p>
                  "加入我们的旅程，一起创新、启发，并在全球每一个角落点燃数据管理的新火花。"
                </p>
              </article>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
