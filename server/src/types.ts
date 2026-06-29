export interface AuthUser {
  id: number
  username: string
  role: 'admin' | 'user'
  disabled: boolean
}

export interface JwtPayload {
  sub: number
  username: string
  role: 'admin' | 'user'
}

export interface ExamFormData {
  exam_id: number
  exam_name: string
  exam_date: string
  exam_type_1: string
  exam_type: string
  total_score: number
  full_score: number
  current_target_score: number | null
  next_target_score: number | null
  total_time: number | null
  question_order: string | null
  notes: string | null
  sections: any[]
  wrong_questions: any[]
  speed_questions: any[]
  fast_correct_questions: any[]
}
