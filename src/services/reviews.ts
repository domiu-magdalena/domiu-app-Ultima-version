import { getBrowserClient } from '@/lib/db/supabase';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ReviewData {
  id: string;
  order_id: string;
  rater_id: string;
  rated_entity_id: string;
  rating_type: 'merchant' | 'courier';
  rating: number;
  review: string | null;
  is_public: boolean;
  response: string | null;
  response_by: string | null;
  created_at: string;
}

export interface ReviewWithAuthor extends ReviewData {
  author_name: string;
  author_avatar: string | null;
}

export interface BusinessStats {
  avg_rating: number;
  total_ratings: number;
  total_reviews: number;
}

export interface CourierStats {
  avg_rating: number;
  total_ratings: number;
  total_deliveries: number;
}

export interface ReviewReport {
  id: string;
  review_id: string;
  reporter_id: string;
  reason: string;
  description: string | null;
  status: string;
  reviewed_by: string | null;
  created_at: string;
}

async function getClient() {
  return getBrowserClient();
}

export const reviewService = {
  async createReview(
    orderId: string,
    raterId: string,
    ratedEntityId: string,
    ratingType: 'merchant' | 'courier',
    rating: number,
    review?: string,
  ): Promise<ReviewData> {
    const supabase = await getClient();
    const { data, error } = await supabase
      .from('ratings')
      .insert({
        order_id: orderId,
        rater_id: raterId,
        rated_entity_id: ratedEntityId,
        rating_type: ratingType,
        rating,
        review: review || null,
        is_public: true,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as any;
  },

  async getBusinessReviews(businessId: string): Promise<ReviewWithAuthor[]> {
    const supabase = await getClient();
    const { data, error } = await supabase
      .from('ratings')
      .select('*, profiles!ratings_rater_id_fkey(first_name, last_name, avatar_url)')
      .eq('rated_entity_id', businessId)
      .eq('rating_type', 'merchant')
      .eq('is_public', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map((r: any) => ({
      id: r.id,
      order_id: r.order_id,
      rater_id: r.rater_id,
      rated_entity_id: r.rated_entity_id,
      rating_type: r.rating_type,
      rating: Number(r.rating),
      review: r.review,
      is_public: r.is_public,
      response: r.response,
      response_by: r.response_by,
      created_at: r.created_at,
      author_name: r.profiles
        ? `${r.profiles.first_name || ''} ${r.profiles.last_name || ''}`.trim()
        : 'Anónimo',
      author_avatar: r.profiles?.avatar_url ?? null,
    }));
  },

  async getCourierReviews(courierId: string): Promise<ReviewWithAuthor[]> {
    const supabase = await getClient();
    const { data, error } = await supabase
      .from('ratings')
      .select('*, profiles!ratings_rater_id_fkey(first_name, last_name, avatar_url)')
      .eq('rated_entity_id', courierId)
      .eq('rating_type', 'courier')
      .eq('is_public', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map((r: any) => ({
      id: r.id,
      order_id: r.order_id,
      rater_id: r.rater_id,
      rated_entity_id: r.rated_entity_id,
      rating_type: r.rating_type,
      rating: Number(r.rating),
      review: r.review,
      is_public: r.is_public,
      response: r.response,
      response_by: r.response_by,
      created_at: r.created_at,
      author_name: r.profiles
        ? `${r.profiles.first_name || ''} ${r.profiles.last_name || ''}`.trim()
        : 'Anónimo',
      author_avatar: r.profiles?.avatar_url ?? null,
    }));
  },

  async getBusinessStats(businessId: string): Promise<BusinessStats> {
    const supabase = await getClient();
    const { data: biz } = await supabase
      .from('businesses')
      .select('rating, total_ratings')
      .eq('id', businessId)
      .single();
    const { count } = await supabase
      .from('ratings')
      .select('*', { count: 'exact', head: true })
      .eq('rated_entity_id', businessId)
      .eq('rating_type', 'merchant')
      .eq('is_public', true)
      .is('deleted_at', null)
      .not('review', 'is', null);
    return {
      avg_rating: Number(biz?.rating ?? 0),
      total_ratings: biz?.total_ratings ?? 0,
      total_reviews: count ?? 0,
    };
  },

  async getCourierStats(courierId: string): Promise<CourierStats> {
    const supabase = await getClient();
    const { data: driver } = await supabase
      .from('drivers')
      .select('rating, total_ratings, completed_deliveries')
      .eq('id', courierId)
      .single();
    return {
      avg_rating: Number(driver?.rating ?? 0),
      total_ratings: driver?.total_ratings ?? 0,
      total_deliveries: driver?.completed_deliveries ?? 0,
    };
  },

  async respondToReview(reviewId: string, userId: string, response: string): Promise<void> {
    const supabase = await getClient();
    const { error } = await supabase
      .from('ratings')
      .update({ response, response_by: userId, response_at: new Date().toISOString() })
      .eq('id', reviewId);
    if (error) throw new Error(error.message);
  },

  async reportReview(reviewId: string, reporterId: string, reason: string, description?: string): Promise<void> {
    const supabase = await getClient();
    const { error } = await supabase
      .from('review_reports')
      .insert({
        review_id: reviewId,
        reporter_id: reporterId,
        reason,
        description: description || null,
        status: 'pending',
      });
    if (error) throw new Error(error.message);
  },

  async getAllReports(): Promise<any[]> {
    const supabase = await getClient();
    const { data, error } = await supabase
      .from('review_reports')
      .select('*, profiles!review_reports_reporter_id_fkey(first_name, last_name), ratings!review_reports_review_id_fkey(review, rating, rating_type, rater_id)')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  },

  async updateReportStatus(reportId: string, status: string, reviewedBy: string): Promise<void> {
    const supabase = await getClient();
    const { error } = await supabase
      .from('review_reports')
      .update({ status, reviewed_by: reviewedBy, reviewed_at: new Date().toISOString() })
      .eq('id', reportId);
    if (error) throw new Error(error.message);
  },

  async softDeleteReview(reviewId: string): Promise<void> {
    const supabase = await getClient();
    const { error } = await supabase
      .from('ratings')
      .update({ deleted_at: new Date().toISOString(), is_public: false })
      .eq('id', reviewId);
    if (error) throw new Error(error.message);
  },

  async getAllReviewsAdmin(): Promise<any[]> {
    const supabase = await getClient();
    const { data, error } = await supabase
      .from('ratings')
      .select('*, profiles!ratings_rater_id_fkey(first_name, last_name)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  },

  async hasOrderBeenReviewed(orderId: string): Promise<boolean> {
    const supabase = await getClient();
    const { count } = await supabase
      .from('ratings')
      .select('*', { count: 'exact', head: true })
      .eq('order_id', orderId)
      .is('deleted_at', null);
    return (count ?? 0) > 0;
  },
};
