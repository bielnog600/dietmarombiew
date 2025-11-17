/*
  # Add DELETE policy for weight history
  
  1. Changes
    - Add DELETE policy for weight_history table
    - Allow users to delete their own weight records
  
  2. Security
    - Users can only delete their own weight history
    - Maintain data isolation between users
*/

-- Create DELETE policy for weight_history
CREATE POLICY "Users can delete weight records"
  ON weight_history
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());