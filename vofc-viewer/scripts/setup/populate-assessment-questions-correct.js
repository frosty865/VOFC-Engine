const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const assessmentQuestions = [
  {
    question_text: "Are security cameras properly positioned and functioning to monitor critical areas?",
    is_root: true,
    question_en: "Are security cameras properly positioned and functioning to monitor critical areas?",
    question_es: "¿Están las cámaras de seguridad posicionadas y funcionando correctamente para monitorear áreas críticas?"
  },
  {
    question_text: "Is access control properly implemented and functioning at all entry points?",
    is_root: true,
    question_en: "Is access control properly implemented and functioning at all entry points?",
    question_es: "¿Está el control de acceso implementado y funcionando correctamente en todos los puntos de entrada?"
  },
  {
    question_text: "Are intrusion detection and alarm systems properly installed and operational?",
    is_root: true,
    question_en: "Are intrusion detection and alarm systems properly installed and operational?",
    question_es: "¿Están los sistemas de detección de intrusiones y alarmas instalados y operacionales correctamente?"
  },
  {
    question_text: "Is perimeter lighting adequate and properly maintained for security purposes?",
    is_root: true,
    question_en: "Is perimeter lighting adequate and properly maintained for security purposes?",
    question_es: "¿Es la iluminación perimetral adecuada y mantenida correctamente para propósitos de seguridad?"
  },
  {
    question_text: "Are perimeter barriers and fencing adequate and properly maintained?",
    is_root: true,
    question_en: "Are perimeter barriers and fencing adequate and properly maintained?",
    question_es: "¿Son las barreras perimetrales y cercas adecuadas y mantenidas correctamente?"
  },
  {
    question_text: "Is security personnel properly trained and positioned to monitor facility security?",
    is_root: true,
    question_en: "Is security personnel properly trained and positioned to monitor facility security?",
    question_es: "¿Está el personal de seguridad entrenado y posicionado correctamente para monitorear la seguridad de la instalación?"
  },
  {
    question_text: "Are background checks conducted for all personnel with access to sensitive areas?",
    is_root: true,
    question_en: "Are background checks conducted for all personnel with access to sensitive areas?",
    question_es: "¿Se realizan verificaciones de antecedentes para todo el personal con acceso a áreas sensibles?"
  },
  {
    question_text: "Is there a clear chain of command and reporting structure for security personnel?",
    is_root: true,
    question_en: "Is there a clear chain of command and reporting structure for security personnel?",
    question_es: "¿Existe una cadena de mando clara y estructura de reportes para el personal de seguridad?"
  },
  {
    question_text: "Are fire safety systems properly installed and regularly tested?",
    is_root: true,
    question_en: "Are fire safety systems properly installed and regularly tested?",
    question_es: "¿Están los sistemas de seguridad contra incendios instalados y probados regularmente?"
  },
  {
    question_text: "Are backup power systems properly installed and regularly tested?",
    is_root: true,
    question_en: "Are backup power systems properly installed and regularly tested?",
    question_es: "¿Están los sistemas de energía de respaldo instalados y probados regularmente?"
  },
  {
    question_text: "Are emergency communication systems properly installed and functional?",
    is_root: true,
    question_en: "Are emergency communication systems properly installed and functional?",
    question_es: "¿Están los sistemas de comunicación de emergencia instalados y funcionando correctamente?"
  },
  {
    question_text: "Are emergency evacuation procedures clearly posted and regularly practiced?",
    is_root: true,
    question_en: "Are emergency evacuation procedures clearly posted and regularly practiced?",
    question_es: "¿Están los procedimientos de evacuación de emergencia claramente publicados y practicados regularmente?"
  },
  {
    question_text: "Are cybersecurity measures properly implemented and regularly updated?",
    is_root: true,
    question_en: "Are cybersecurity measures properly implemented and regularly updated?",
    question_es: "¿Están las medidas de ciberseguridad implementadas y actualizadas regularmente?"
  },
  {
    question_text: "Are network security controls properly configured and monitored?",
    is_root: true,
    question_en: "Are network security controls properly configured and monitored?",
    question_es: "¿Están los controles de seguridad de red configurados y monitoreados correctamente?"
  },
  {
    question_text: "Are data backup and recovery procedures properly implemented?",
    is_root: true,
    question_en: "Are data backup and recovery procedures properly implemented?",
    question_es: "¿Están los procedimientos de respaldo y recuperación de datos implementados correctamente?"
  },
  {
    question_text: "Are security policies and procedures clearly documented and communicated?",
    is_root: true,
    question_en: "Are security policies and procedures clearly documented and communicated?",
    question_es: "¿Están las políticas y procedimientos de seguridad claramente documentados y comunicados?"
  },
  {
    question_text: "Are security incidents properly reported and investigated?",
    is_root: true,
    question_en: "Are security incidents properly reported and investigated?",
    question_es: "¿Se reportan e investigan correctamente los incidentes de seguridad?"
  },
  {
    question_text: "Are security assessments conducted regularly and findings addressed?",
    is_root: true,
    question_en: "Are security assessments conducted regularly and findings addressed?",
    question_es: "¿Se realizan evaluaciones de seguridad regularmente y se abordan los hallazgos?"
  }
];

async function populateAssessmentQuestions() {
  console.log('📝 Populating assessment_questions table with correct structure...\n');

  try {
    // First check if table already has data
    const { data: existingQuestions, error: checkError } = await supabase
      .from('assessment_questions')
      .select('*')
      .limit(1);

    if (checkError) {
      console.log('❌ Error checking assessment_questions table:', checkError.message);
      return;
    }

    if (existingQuestions && existingQuestions.length > 0) {
      console.log(`✅ assessment_questions table already has data`);
      console.log('Sample question:', existingQuestions[0].question_text);
      return;
    }

    console.log('📝 Inserting assessment questions...');
    const { data, error } = await supabase
      .from('assessment_questions')
      .insert(assessmentQuestions)
      .select();

    if (error) {
      console.error('❌ Error inserting questions:', error);
    } else {
      console.log(`✅ Successfully inserted ${data.length} assessment questions`);
      console.log('\n📋 Sample questions created:');
      data.slice(0, 3).forEach((q, i) => {
        console.log(`   ${i+1}. ${q.question_text}`);
        console.log(`       EN: ${q.question_en}`);
        console.log(`       ES: ${q.question_es}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

populateAssessmentQuestions();

