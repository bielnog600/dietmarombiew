import React from 'react';

interface BodyDiagramProps {
  activeMeasurement?: string | null;
}

export default function BodyDiagram({ activeMeasurement }: BodyDiagramProps) {
  const getStrokeColor = (measurement: string) => {
    return activeMeasurement === measurement ? '#f8c045' : '#6b7280';
  };

  const getStrokeWidth = (measurement: string) => {
    return activeMeasurement === measurement ? '3' : '2';
  };

  return (
    <svg
      viewBox="0 0 200 400"
      className="w-full h-full"
      style={{ maxHeight: '400px' }}
    >
      {/* Head */}
      <circle
        cx="100"
        cy="30"
        r="20"
        fill="none"
        stroke="#9ca3af"
        strokeWidth="2"
      />

      {/* Neck */}
      <line
        x1="100"
        y1="50"
        x2="100"
        y2="70"
        stroke="#9ca3af"
        strokeWidth="2"
      />

      {/* Chest/Torso */}
      <ellipse
        cx="100"
        cy="110"
        rx="35"
        ry="45"
        fill="none"
        stroke={getStrokeColor('chest')}
        strokeWidth={getStrokeWidth('chest')}
        className="transition-all duration-200"
      />
      {activeMeasurement === 'chest' && (
        <>
          <line
            x1="65"
            y1="110"
            x2="45"
            y2="110"
            stroke="#f8c045"
            strokeWidth="2"
            markerEnd="url(#arrowhead)"
          />
          <line
            x1="135"
            y1="110"
            x2="155"
            y2="110"
            stroke="#f8c045"
            strokeWidth="2"
            markerEnd="url(#arrowhead)"
          />
        </>
      )}

      {/* Waist */}
      <ellipse
        cx="100"
        cy="160"
        rx="28"
        ry="8"
        fill="none"
        stroke={getStrokeColor('waist')}
        strokeWidth={getStrokeWidth('waist')}
        className="transition-all duration-200"
      />
      {activeMeasurement === 'waist' && (
        <>
          <line
            x1="72"
            y1="160"
            x2="52"
            y2="160"
            stroke="#f8c045"
            strokeWidth="2"
            markerEnd="url(#arrowhead)"
          />
          <line
            x1="128"
            y1="160"
            x2="148"
            y2="160"
            stroke="#f8c045"
            strokeWidth="2"
            markerEnd="url(#arrowhead)"
          />
        </>
      )}

      {/* Abdomen */}
      <ellipse
        cx="100"
        cy="180"
        rx="30"
        ry="15"
        fill="none"
        stroke={getStrokeColor('abdomen')}
        strokeWidth={getStrokeWidth('abdomen')}
        className="transition-all duration-200"
      />
      {activeMeasurement === 'abdomen' && (
        <>
          <line
            x1="70"
            y1="180"
            x2="50"
            y2="180"
            stroke="#f8c045"
            strokeWidth="2"
            markerEnd="url(#arrowhead)"
          />
          <line
            x1="130"
            y1="180"
            x2="150"
            y2="180"
            stroke="#f8c045"
            strokeWidth="2"
            markerEnd="url(#arrowhead)"
          />
        </>
      )}

      {/* Hips */}
      <ellipse
        cx="100"
        cy="205"
        rx="35"
        ry="12"
        fill="none"
        stroke={getStrokeColor('hips')}
        strokeWidth={getStrokeWidth('hips')}
        className="transition-all duration-200"
      />
      {activeMeasurement === 'hips' && (
        <>
          <line
            x1="65"
            y1="205"
            x2="45"
            y2="205"
            stroke="#f8c045"
            strokeWidth="2"
            markerEnd="url(#arrowhead)"
          />
          <line
            x1="135"
            y1="205"
            x2="155"
            y2="205"
            stroke="#f8c045"
            strokeWidth="2"
            markerEnd="url(#arrowhead)"
          />
        </>
      )}

      {/* Left Arm */}
      <g>
        <line
          x1="65"
          y1="80"
          x2="35"
          y2="140"
          stroke="#9ca3af"
          strokeWidth="2"
        />
        <ellipse
          cx="35"
          cy="115"
          rx="8"
          ry="15"
          fill="none"
          stroke={getStrokeColor('left_arm')}
          strokeWidth={getStrokeWidth('left_arm')}
          className="transition-all duration-200"
          transform="rotate(-25 35 115)"
        />
        {activeMeasurement === 'left_arm' && (
          <>
            <line
              x1="28"
              y1="115"
              x2="18"
              y2="115"
              stroke="#f8c045"
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
            />
            <line
              x1="42"
              y1="115"
              x2="52"
              y2="115"
              stroke="#f8c045"
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
            />
          </>
        )}
        <line
          x1="35"
          y1="140"
          x2="30"
          y2="180"
          stroke="#9ca3af"
          strokeWidth="2"
        />
      </g>

      {/* Right Arm */}
      <g>
        <line
          x1="135"
          y1="80"
          x2="165"
          y2="140"
          stroke="#9ca3af"
          strokeWidth="2"
        />
        <ellipse
          cx="165"
          cy="115"
          rx="8"
          ry="15"
          fill="none"
          stroke={getStrokeColor('right_arm')}
          strokeWidth={getStrokeWidth('right_arm')}
          className="transition-all duration-200"
          transform="rotate(25 165 115)"
        />
        {activeMeasurement === 'right_arm' && (
          <>
            <line
              x1="172"
              y1="115"
              x2="182"
              y2="115"
              stroke="#f8c045"
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
            />
            <line
              x1="158"
              y1="115"
              x2="148"
              y2="115"
              stroke="#f8c045"
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
            />
          </>
        )}
        <line
          x1="165"
          y1="140"
          x2="170"
          y2="180"
          stroke="#9ca3af"
          strokeWidth="2"
        />
      </g>

      {/* Left Leg */}
      <g>
        <line
          x1="85"
          y1="217"
          x2="80"
          y2="320"
          stroke="#9ca3af"
          strokeWidth="2"
        />
        <ellipse
          cx="82"
          cy="260"
          rx="12"
          ry="20"
          fill="none"
          stroke={getStrokeColor('left_thigh')}
          strokeWidth={getStrokeWidth('left_thigh')}
          className="transition-all duration-200"
        />
        {activeMeasurement === 'left_thigh' && (
          <>
            <line
              x1="70"
              y1="260"
              x2="60"
              y2="260"
              stroke="#f8c045"
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
            />
            <line
              x1="94"
              y1="260"
              x2="104"
              y2="260"
              stroke="#f8c045"
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
            />
          </>
        )}
        <line
          x1="80"
          y1="320"
          x2="75"
          y2="370"
          stroke="#9ca3af"
          strokeWidth="2"
        />
      </g>

      {/* Right Leg */}
      <g>
        <line
          x1="115"
          y1="217"
          x2="120"
          y2="320"
          stroke="#9ca3af"
          strokeWidth="2"
        />
        <ellipse
          cx="118"
          cy="260"
          rx="12"
          ry="20"
          fill="none"
          stroke={getStrokeColor('right_thigh')}
          strokeWidth={getStrokeWidth('right_thigh')}
          className="transition-all duration-200"
        />
        {activeMeasurement === 'right_thigh' && (
          <>
            <line
              x1="130"
              y1="260"
              x2="140"
              y2="260"
              stroke="#f8c045"
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
            />
            <line
              x1="106"
              y1="260"
              x2="96"
              y2="260"
              stroke="#f8c045"
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
            />
          </>
        )}
        <line
          x1="120"
          y1="320"
          x2="125"
          y2="370"
          stroke="#9ca3af"
          strokeWidth="2"
        />
      </g>

      {/* Arrow marker definition */}
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="10"
          refX="8"
          refY="3"
          orient="auto"
        >
          <polygon
            points="0 0, 6 3, 0 6"
            fill="#f8c045"
          />
        </marker>
      </defs>
    </svg>
  );
}
