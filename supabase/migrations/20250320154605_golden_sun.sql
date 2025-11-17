/*
  # Initial Schema Setup for Nutrition App

  1. New Tables
    - users
      - Stores user profile information and nutritional requirements
    - diets
      - Stores diet plans for users
    - meals
      - Stores meal information within diets
    - foods
      - Stores food database
    - meal_foods
      - Junction table for meals and foods

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create users table
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  daily_calories integer NOT NULL DEFAULT 2000,
  water_intake integer NOT NULL DEFAULT 2000,
  created_at timestamptz DEFAULT now()
);

-- Create foods table
CREATE TABLE foods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  calories integer NOT NULL,
  protein numeric(5,2) NOT NULL,
  carbs numeric(5,2) NOT NULL,
  fats numeric(5,2) NOT NULL,
  portion text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create diets table
CREATE TABLE diets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  calories integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create meals table
CREATE TABLE meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diet_id uuid REFERENCES diets(id) NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create meal_foods junction table
CREATE TABLE meal_foods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id uuid REFERENCES meals(id) NOT NULL,
  food_id uuid REFERENCES foods(id) NOT NULL,
  quantity numeric(5,2) NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE diets ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_foods ENABLE ROW LEVEL SECURITY;

-- Create security policies
CREATE POLICY "Users can read their own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Everyone can read foods"
  ON foods
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can read their own diets"
  ON diets
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own diets"
  ON diets
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own meals"
  ON meals
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM diets
    WHERE diets.id = meals.diet_id
    AND diets.user_id = auth.uid()
  ));

CREATE POLICY "Users can read their own meal_foods"
  ON meal_foods
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM meals
    JOIN diets ON diets.id = meals.diet_id
    WHERE meals.id = meal_foods.meal_id
    AND diets.user_id = auth.uid()
  ));