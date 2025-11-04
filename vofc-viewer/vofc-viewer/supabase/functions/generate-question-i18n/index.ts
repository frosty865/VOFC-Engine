// inside supabase/functions/generate-question-i18n/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const systemPrompt = `
You are a security assessment language model that rewrites vulnerabilities into clear, direct assessment questions.

Rules:
- Output one short question in third-person active voice.
- Keep at an undergraduate reading level.
- Focus on the evaluator's perspective ("Is…?", "Does…?", "Are…?").
- Remove all diagnostic or judgmental tone.
- Do NOT restate "The facility does not…"; rewrite as a neutral question about presence, adequacy, or implementation.
- Provide both English (en) and Spanish (es) translations in strict JSON: {"en": "...", "es": "..."}.
`;

class SecurityQuestionGenerator {
  private questionTemplates = [
    {
      patterns: [/camera|surveillance|monitoring|video|cctv/],
      en: "Are security cameras and surveillance systems properly positioned and functioning to monitor critical areas?",
      es: "¿Están las cámaras de seguridad y sistemas de vigilancia posicionados y funcionando correctamente para monitorear áreas críticas?"
    },
    {
      patterns: [/access|door|entry|gate|portal|lock/],
      en: "Is access control properly implemented and functioning at all entry points?",
      es: "¿Está el control de acceso implementado y funcionando correctamente en todos los puntos de entrada?"
    },
    {
      patterns: [/alarm|detection|sensor|intrusion|motion/],
      en: "Are intrusion detection and alarm systems properly installed and operational?",
      es: "¿Están los sistemas de detección de intrusiones y alarmas instalados y operacionales correctamente?"
    },
    {
      patterns: [/lighting|illumination|light|brightness/],
      en: "Is perimeter lighting adequate and properly maintained for security purposes?",
      es: "¿Es la iluminación perimetral adecuada y mantenida correctamente para propósitos de seguridad?"
    },
    {
      patterns: [/fence|barrier|perimeter|boundary|wall/],
      en: "Are perimeter barriers and fencing adequate and properly maintained?",
      es: "¿Son las barreras perimetrales y cercas adecuadas y mantenidas correctamente?"
    },
    {
      patterns: [/personnel|staff|guard|security|training|officer/],
      en: "Is security personnel properly trained and positioned to monitor facility security?",
      es: "¿Está el personal de seguridad entrenado y posicionado correctamente para monitorear la seguridad de la instalación?"
    },
    {
      patterns: [/fire|safety|emergency|evacuation|sprinkler/],
      en: "Are fire safety and emergency systems properly installed and regularly tested?",
      es: "¿Están los sistemas de seguridad contra incendios y emergencias instalados y probados regularmente?"
    },
    {
      patterns: [/cyber|network|computer|digital|data|internet/],
      en: "Are cybersecurity measures properly implemented and regularly updated?",
      es: "¿Están las medidas de ciberseguridad implementadas y actualizadas regularmente?"
    },
    {
      patterns: [/communication|radio|phone|emergency|intercom/],
      en: "Are emergency communication systems properly installed and functional?",
      es: "¿Están los sistemas de comunicación de emergencia instalados y funcionando correctamente?"
    },
    {
      patterns: [/power|backup|generator|electrical|outage/],
      en: "Are backup power systems properly installed and regularly tested?",
      es: "¿Están los sistemas de energía de respaldo instalados y probados regularmente?"
    },
    {
      patterns: [/vehicle|parking|automobile|car/],
      en: "Are vehicle access controls and parking security measures properly implemented?",
      es: "¿Están los controles de acceso vehicular y medidas de seguridad de estacionamiento implementados correctamente?"
    },
    {
      patterns: [/visitor|guest|badge|identification/],
      en: "Are visitor management and identification systems properly implemented and functioning?",
      es: "¿Están los sistemas de gestión de visitantes e identificación implementados y funcionando correctamente?"
    }
  ]

  generateQuestions(text: string, questionType: string = 'root'): { en: string; es: string } {
    // Find the best matching template based on pattern matching
    let bestMatch = null
    let maxMatches = 0

    for (const template of this.questionTemplates) {
      let matchCount = 0
      for (const pattern of template.patterns) {
        if (pattern.test(text)) {
          matchCount++
        }
      }
      
      if (matchCount > maxMatches) {
        maxMatches = matchCount
        bestMatch = template
      }
    }

    // Generate questions based on type
    if (questionType === 'root') {
      // Root questions are broad, high-level assessment questions
      if (bestMatch && maxMatches > 0) {
        return {
          en: bestMatch.en,
          es: bestMatch.es
        }
      }
    } else if (questionType === 'child') {
      // Child questions are more specific, detailed follow-up questions
      if (bestMatch && maxMatches > 0) {
        return this.generateChildQuestion(bestMatch, text)
      }
    }

    // Fallback: Generate a contextual question based on key security terms
    const securityTerms = this.extractSecurityTerms(text)
    if (securityTerms.length > 0) {
      const primaryTerm = securityTerms[0]
      if (questionType === 'child') {
        return this.generateSpecificChildQuestion(primaryTerm, text)
      } else {
        return {
          en: `Are ${primaryTerm} properly implemented and functioning?`,
          es: `¿Están las ${primaryTerm} implementadas y funcionando correctamente?`
        }
      }
    }

    // Final fallback
    if (questionType === 'child') {
      return {
        en: "Are specific security procedures documented and followed?",
        es: "¿Están los procedimientos de seguridad específicos documentados y seguidos?"
      }
    } else {
      return {
        en: "Are security measures properly implemented and functioning?",
        es: "¿Están las medidas de seguridad implementadas y funcionando correctamente?"
      }
    }
  }

  private generateChildQuestion(template: any, text: string): { en: string; es: string } {
    // Generate more specific follow-up questions based on the root template
    const childTemplates = {
      'camera|surveillance|monitoring|video|cctv': {
        en: "Are surveillance recordings properly stored and accessible for security review?",
        es: "¿Están las grabaciones de vigilancia almacenadas y accesibles para revisión de seguridad?"
      },
      'access|door|entry|gate|portal|lock': {
        en: "Are access logs properly maintained and regularly reviewed?",
        es: "¿Están los registros de acceso mantenidos y revisados regularmente?"
      },
      'alarm|detection|sensor|intrusion|motion': {
        en: "Are alarm systems tested regularly and response procedures documented?",
        es: "¿Están los sistemas de alarma probados regularmente y los procedimientos de respuesta documentados?"
      },
      'lighting|illumination|light|brightness': {
        en: "Is lighting maintenance scheduled and documented with proper coverage maps?",
        es: "¿Está el mantenimiento de iluminación programado y documentado con mapas de cobertura adecuados?"
      },
      'fence|barrier|perimeter|boundary|wall': {
        en: "Are perimeter barriers inspected regularly for damage or tampering?",
        es: "¿Son las barreras perimetrales inspeccionadas regularmente por daños o manipulación?"
      },
      'personnel|staff|guard|security|training|officer': {
        en: "Are security personnel background checks current and training records maintained?",
        es: "¿Están las verificaciones de antecedentes del personal de seguridad actualizadas y los registros de entrenamiento mantenidos?"
      },
      'fire|safety|emergency|evacuation|sprinkler': {
        en: "Are emergency evacuation routes clearly marked and regularly tested?",
        es: "¿Están las rutas de evacuación de emergencia claramente marcadas y probadas regularmente?"
      },
      'cyber|network|computer|digital|data|internet': {
        en: "Are cybersecurity policies updated regularly and staff trained on current threats?",
        es: "¿Están las políticas de ciberseguridad actualizadas regularmente y el personal entrenado en amenazas actuales?"
      },
      'communication|radio|phone|emergency|intercom': {
        en: "Are communication systems tested regularly with backup procedures in place?",
        es: "¿Están los sistemas de comunicación probados regularmente con procedimientos de respaldo en su lugar?"
      },
      'power|backup|generator|electrical|outage': {
        en: "Are backup power systems tested monthly with fuel supplies maintained?",
        es: "¿Están los sistemas de energía de respaldo probados mensualmente con suministros de combustible mantenidos?"
      }
    }

    // Find matching child template
    for (const [pattern, childTemplate] of Object.entries(childTemplates)) {
      if (new RegExp(pattern).test(text)) {
        return childTemplate
      }
    }

    // Default child question
    return {
      en: "Are specific procedures documented and regularly reviewed for effectiveness?",
      es: "¿Están los procedimientos específicos documentados y revisados regularmente por efectividad?"
    }
  }

  private generateSpecificChildQuestion(primaryTerm: string, text: string): { en: string; es: string } {
    // Generate very specific follow-up questions
    const specificQuestions = {
      'surveillance systems': {
        en: "Are surveillance system recordings retained for the required duration and properly secured?",
        es: "¿Están las grabaciones del sistema de vigilancia retenidas por la duración requerida y aseguradas adecuadamente?"
      },
      'access control systems': {
        en: "Are access control logs monitored in real-time with automated alerts for unauthorized attempts?",
        es: "¿Están los registros de control de acceso monitoreados en tiempo real con alertas automatizadas para intentos no autorizados?"
      },
      'intrusion detection systems': {
        en: "Are intrusion detection sensors calibrated and tested with documented response procedures?",
        es: "¿Están los sensores de detección de intrusiones calibrados y probados con procedimientos de respuesta documentados?"
      },
      'perimeter lighting': {
        en: "Is perimeter lighting designed with overlapping coverage and emergency backup systems?",
        es: "¿Está la iluminación perimetral diseñada con cobertura superpuesta y sistemas de respaldo de emergencia?"
      },
      'perimeter barriers': {
        en: "Are perimeter barriers designed to delay intrusion and provide early warning capabilities?",
        es: "¿Están las barreras perimetrales diseñadas para retrasar intrusiones y proporcionar capacidades de alerta temprana?"
      },
      'security personnel': {
        en: "Are security personnel equipped with proper communication devices and emergency response training?",
        es: "¿Está el personal de seguridad equipado con dispositivos de comunicación adecuados y entrenamiento de respuesta de emergencia?"
      },
      'fire safety systems': {
        en: "Are fire safety systems integrated with building management systems for automated response?",
        es: "¿Están los sistemas de seguridad contra incendios integrados con sistemas de gestión de edificios para respuesta automatizada?"
      },
      'cybersecurity measures': {
        en: "Are cybersecurity measures updated with latest threat intelligence and incident response procedures?",
        es: "¿Están las medidas de ciberseguridad actualizadas con la última inteligencia de amenazas y procedimientos de respuesta a incidentes?"
      },
      'communication systems': {
        en: "Are communication systems designed with redundancy and failover capabilities for emergency situations?",
        es: "¿Están los sistemas de comunicación diseñados con redundancia y capacidades de conmutación por error para situaciones de emergencia?"
      },
      'backup power systems': {
        en: "Are backup power systems designed to maintain critical security functions during extended outages?",
        es: "¿Están los sistemas de energía de respaldo diseñados para mantener funciones críticas de seguridad durante cortes prolongados?"
      }
    }

    return specificQuestions[primaryTerm] || {
      en: `Are ${primaryTerm} procedures documented with specific performance metrics and regular audits?`,
      es: `¿Están los procedimientos de ${primaryTerm} documentados con métricas de rendimiento específicas y auditorías regulares?`
    }
  }

  private extractSecurityTerms(text: string): string[] {
    const terms = []
    
    if (text.includes('camera') || text.includes('surveillance')) terms.push('surveillance systems')
    if (text.includes('access') || text.includes('door')) terms.push('access control systems')
    if (text.includes('alarm') || text.includes('detection')) terms.push('intrusion detection systems')
    if (text.includes('lighting') || text.includes('illumination')) terms.push('perimeter lighting')
    if (text.includes('fence') || text.includes('barrier')) terms.push('perimeter barriers')
    if (text.includes('personnel') || text.includes('guard')) terms.push('security personnel')
    if (text.includes('fire') || text.includes('safety')) terms.push('fire safety systems')
    if (text.includes('cyber') || text.includes('network')) terms.push('cybersecurity measures')
    if (text.includes('communication') || text.includes('radio')) terms.push('communication systems')
    if (text.includes('power') || text.includes('backup')) terms.push('backup power systems')
    if (text.includes('vehicle') || text.includes('parking')) terms.push('vehicle security measures')
    if (text.includes('visitor') || text.includes('guest')) terms.push('visitor management systems')
    
    return terms
  }
}


serve(async (req) => {
  try {
    const { text, questionType = 'root' } = await req.json()
    
    if (!text) {
      return new Response(
        JSON.stringify({ error: "Text is required" }),
        { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      )
    }

    // Generate proper human English assessment questions using intelligent templates
    const processedText = text.toLowerCase().trim()
    
    // Extract key security concepts and generate contextual questions
    const questionGenerator = new SecurityQuestionGenerator()
    const questions = questionGenerator.generateQuestions(processedText, questionType)
    
    const enQuestion = questions.en
    const esQuestion = questions.es

    const result = {
      en: enQuestion,
      es: esQuestion
    }

    return new Response(
      JSON.stringify(result),
      { 
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    )
  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    )
  }
})
