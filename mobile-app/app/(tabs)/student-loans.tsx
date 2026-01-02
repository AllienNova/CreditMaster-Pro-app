/**
 * Student Loans Tab Entry Point
 * Redirects to the student-loans stack navigator
 */

import { Redirect } from 'expo-router';

export default function StudentLoansTab() {
  return <Redirect href="/student-loans" />;
}
