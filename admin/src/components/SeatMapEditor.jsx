import { useState, useEffect } from "react";
import {
  Grid,
  X,
  Check,
  Plus,
  Edit2,
  CheckCircle,
  XCircle,
  Hash,
} from "lucide-react";

/**
 * SeatMapEditor Component
 *
 * Visual seat map editor that allows:
 * - Setting rows and columns
 * - Toggling seats on/off
 * - Auto-generating seat labels (A1, A2, B1, etc.)
 * - Exporting data in Android-friendly format
 * - Showing booked seats (when bookedSeats prop is provided)
 *
 * @param {Object} props
 * @param {Object} props.value - Current seat layout { rows, columns, seats: [{row, column, enabled, seatLabel}] }
 * @param {Function} props.onChange - Callback when layout changes
 * @param {Boolean} props.readOnly - If true, displays layout in read-only mode (no editing)
 * @param {Array} props.bookedSeats - Array of booked seat labels (e.g., ["A1", "B2", "C3"])
 */
const SeatMapEditor = ({
  value,
  onChange,
  readOnly = false,
  bookedSeats = [],
}) => {
  const [rows, setRows] = useState(value?.rows || 10);
  const [columns, setColumns] = useState(value?.columns || 4);
  const [seatMap, setSeatMap] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [tempRows, setTempRows] = useState(value?.rows || 10);
  const [tempColumns, setTempColumns] = useState(value?.columns || 4);
  const [editingSeatLabel, setEditingSeatLabel] = useState(null); // {row, col} for seat being edited
  const [tempSeatLabel, setTempSeatLabel] = useState("");
  const [duplicateError, setDuplicateError] = useState(""); // Add error state for duplicate seat numbers

  // Generate seat labels: A1, A2, B1, B2, etc.
  const generateSeatLabel = (row, col) => {
    const rowLetter = String.fromCharCode(65 + row); // A, B, C, ...
    return `${rowLetter}${col + 1}`;
  };

  // Initialize or update seat map when value prop changes
  useEffect(() => {
    if (value?.map && Array.isArray(value.map) && value.map.length > 0) {
      // Load existing map and convert all labels to uppercase
      const normalizedMap = value.map.map((row) =>
        row.map((seat) => ({
          ...seat,
          seatLabel: seat.seatLabel ? seat.seatLabel.toUpperCase() : "",
        }))
      );
      setSeatMap(normalizedMap);
      setRows(value.rows || value.map.length);
      setColumns(value.columns || value.map[0]?.length || 4);
    } else if (
      value?.seats &&
      Array.isArray(value.seats) &&
      value.seats.length > 0
    ) {
      // Convert flat seats array to 2D map
      const numRows =
        value.rows || Math.max(...value.seats.map((s) => s.row)) + 1;
      const numCols =
        value.columns || Math.max(...value.seats.map((s) => s.column)) + 1;
      const newMap = [];
      for (let row = 0; row < numRows; row++) {
        const rowData = [];
        for (let col = 0; col < numCols; col++) {
          const seat = value.seats.find(
            (s) => s.row === row && s.column === col
          );
          if (seat) {
            // Preserve existing seat data, but if label is default (A1, A2, etc.), clear it
            // Also convert any existing label to uppercase
            const defaultLabel = generateSeatLabel(row, col);
            const existingLabel = seat.seatLabel || "";
            const normalizedLabel =
              existingLabel === defaultLabel ? "" : existingLabel.toUpperCase();
            rowData.push({
              ...seat,
              seatLabel: normalizedLabel,
            });
          } else {
            rowData.push({
              enabled: false,
              seatLabel: "", // Empty label for disabled seats
            });
          }
        }
        newMap.push(rowData);
      }
      setSeatMap(newMap);
      setRows(numRows);
      setColumns(numCols);
      setTempRows(numRows);
      setTempColumns(numCols);
    } else {
      // Create new map
      generateSeatMap(rows, columns);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Generate initial seat map
  const generateSeatMap = (numRows, numCols) => {
    const newMap = [];
    for (let row = 0; row < numRows; row++) {
      const rowData = [];
      for (let col = 0; col < numCols; col++) {
        rowData.push({
          enabled: true,
          seatLabel: "", // Start with empty label - user will add custom numbers
        });
      }
      newMap.push(rowData);
    }
    setSeatMap(newMap);
    notifyChange(newMap, numRows, numCols);
  };

  // Handle seat click - open input for seat number or toggle if disabled
  const handleSeatClick = (row, col, e) => {
    const seat = seatMap[row][col];

    // If seat is enabled, open input field for seat number
    if (seat.enabled) {
      e.preventDefault();
      setEditingSeatLabel({ row, col });
      setTempSeatLabel(seat.seatLabel || "");
      return;
    }

    // If seat is disabled, toggle it to enabled
    const newMap = seatMap.map((r, rIdx) =>
      r.map((s, cIdx) => {
        if (rIdx === row && cIdx === col) {
          return {
            ...s,
            enabled: true,
            seatLabel: "", // Start with empty label when enabling
          };
        }
        return s;
      })
    );
    setSeatMap(newMap);
    notifyChange(newMap, rows, columns);
  };

  // Save seat label
  const saveSeatLabel = () => {
    if (editingSeatLabel) {
      const { row, col } = editingSeatLabel;
      const label = tempSeatLabel.trim().toUpperCase();
      
      // Check for duplicate seat numbers (only if label is not empty)
      if (label !== "") {
        const isDuplicate = seatMap.some((r, rIdx) =>
          r.some((seat, cIdx) => {
            // Skip the current seat being edited
            if (rIdx === row && cIdx === col) {
              return false;
            }
            // Check if another seat has the same label (case-insensitive)
            return (
              seat.enabled &&
              seat.seatLabel &&
              seat.seatLabel.toUpperCase() === label
            );
          })
        );

        if (isDuplicate) {
          setDuplicateError(`Seat number "${label}" already exists. Please use a different number.`);
          return; // Don't save if duplicate
        }
      }

      // Clear any previous error
      setDuplicateError("");

      const newMap = seatMap.map((r, rIdx) =>
        r.map((seat, cIdx) => {
          if (rIdx === row && cIdx === col) {
            // Use custom label (can be empty), convert to uppercase
            return {
              ...seat,
              seatLabel: label,
            };
          }
          return seat;
        })
      );
      setSeatMap(newMap);
      setEditingSeatLabel(null);
      setTempSeatLabel("");
      notifyChange(newMap, rows, columns);
    }
  };

  // Cancel seat label editing
  const cancelSeatLabelEdit = () => {
    setEditingSeatLabel(null);
    setTempSeatLabel("");
    setDuplicateError(""); // Clear error when canceling
  };

  // Notify parent component of changes
  const notifyChange = (map, numRows, numCols) => {
    // Convert 2D map to flat array for Android (easier to parse)
    const seatsArray = [];
    map.forEach((row, rowIdx) => {
      row.forEach((seat, colIdx) => {
        seatsArray.push({
          row: rowIdx,
          column: colIdx,
          enabled: seat.enabled,
          // Use custom label if provided; leave empty string for unlabeled seats
          // (avoid auto-generating default labels here so counting reflects only user-entered labels)
          seatLabel: seat.seatLabel || "",
        });
      });
    });

    // Count only seats that have an explicit non-empty seatLabel (user-entered number)
    const labeledCount = map
      .flatMap((row) => row)
      .filter(
        (seat) => seat && seat.seatLabel && String(seat.seatLabel).trim() !== ""
      ).length;

    const layoutData = {
      rows: numRows,
      columns: numCols,
      map: map, // 2D array for frontend
      seats: seatsArray, // Flat array for Android (with default labels for tracking)
      totalSeats: labeledCount,
    };

    onChange(layoutData);
  };

  // Handle edit button click
  const handleEditClick = () => {
    setIsEditing(true);
    setTempRows(rows);
    setTempColumns(columns);
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setIsEditing(false);
    setTempRows(rows);
    setTempColumns(columns);
  };

  // Handle apply changes
  const handleApplyChanges = () => {
    const newRows = Math.max(1, Math.min(50, parseInt(tempRows) || 1));
    const newCols = Math.max(1, Math.min(10, parseInt(tempColumns) || 1));
    setRows(newRows);
    setColumns(newCols);
    setTempRows(newRows);
    setTempColumns(newCols);
    setIsEditing(false);
    generateSeatMap(newRows, newCols);
  };

  // Handle temp rows change (only updates input, doesn't regenerate)
  const handleTempRowsChange = (e) => {
    const value = e.target.value;
    if (
      value === "" ||
      (/^\d+$/.test(value) && parseInt(value) >= 1 && parseInt(value) <= 50)
    ) {
      setTempRows(value);
    }
  };

  // Handle temp columns change (only updates input, doesn't regenerate)
  const handleTempColumnsChange = (e) => {
    const value = e.target.value;
    if (
      value === "" ||
      (/^\d+$/.test(value) && parseInt(value) >= 1 && parseInt(value) <= 10)
    ) {
      setTempColumns(value);
    }
  };

  // Calculate enabled seats count
  const enabledSeatsCount = seatMap.reduce(
    (count, row) => count + row.filter((seat) => seat.enabled).length,
    0
  );

  // If readOnly, don't show edit controls
  if (readOnly) {
    return (
      <div className="space-y-4">
        {/* Read-only display */}
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-700">
              <span className="font-medium">Rows:</span> {rows}
            </div>
            <div className="text-sm text-gray-700">
              <span className="font-medium">Columns:</span> {columns}
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium">Total Seats:</span>{" "}
              {enabledSeatsCount} / {rows * columns}
            </div>
          </div>
        </div>

        {/* Seat Map Grid - Read Only */}
        <div className="border border-gray-300 rounded-lg p-4 bg-white overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Seat Grid - No headers */}
            <div className="space-y-1">
              {seatMap.map((row, rowIdx) => (
                <div
                  key={rowIdx}
                  className="flex items-center gap-1 justify-center"
                >
                  {/* Seats - Read Only */}
                  {row.map((seat, colIdx) => {
                    const isBooked =
                      bookedSeats.length > 0 &&
                      seat.seatLabel &&
                      bookedSeats.some(
                        (booked) =>
                          booked.toUpperCase() === seat.seatLabel.toUpperCase()
                      );

                    return (
                      <div
                        key={`${rowIdx}-${colIdx}`}
                        className={`w-12 h-12 flex flex-col items-center justify-center rounded-md border-2 shadow-sm transition-all ${
                          !seat.enabled
                            ? "bg-slate-100 border-slate-300 text-slate-400 line-through cursor-not-allowed"
                            : isBooked
                            ? "bg-rose-100 border-rose-500 text-rose-700 shadow-rose-200/50 cursor-not-allowed"
                            : seat.seatLabel
                            ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-emerald-200/50 hover:bg-emerald-100 hover:shadow-md cursor-pointer"
                            : "bg-amber-50 border-amber-400 text-amber-600 hover:bg-amber-100 cursor-pointer"
                        }`}
                        title={
                          !seat.enabled
                            ? "Not Available"
                            : isBooked
                            ? `${seat.seatLabel} - Booked`
                            : seat.seatLabel
                            ? `${seat.seatLabel} - Available`
                            : "Available - Click to add seat number"
                        }
                      >
                        {seat.enabled ? (
                          seat.seatLabel ? (
                            <span className="text-[10px] font-semibold leading-tight">
                              {seat.seatLabel}
                            </span>
                          ) : (
                            <Plus className="h-4 w-4" />
                          )
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-sm text-gray-700 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-emerald-50 border-2 border-emerald-500 rounded-md shadow-sm"></div>
            <span className="font-medium">Available Seat</span>
          </div>
          {bookedSeats.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-rose-100 border-2 border-rose-500 rounded-md shadow-sm"></div>
              <span className="font-medium">Booked Seat</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-slate-100 border-2 border-slate-300 rounded-md"></div>
            <span className="font-medium">Not Available</span>
          </div>
        </div>

        {/* Seat Labels Display */}
        {enabledSeatsCount > 0 && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-xs font-medium text-gray-700 mb-2">
              Available Seat Labels:
            </div>
            <div className="text-xs text-gray-600 font-mono">
              {seatMap
                .flatMap((row) =>
                  row
                    .filter((seat) => seat.enabled)
                    .map((seat) => seat.seatLabel)
                )
                .join(", ")}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
        {!isEditing ? (
          <>
            {/* Display Mode - Show current dimensions and Edit button */}
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-700">
                <span className="font-medium">Rows:</span> {rows}
              </div>
              <div className="text-sm text-gray-700">
                <span className="font-medium">Columns:</span> {columns}
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium">Total Seats:</span>{" "}
                {enabledSeatsCount} / {rows * columns}
              </div>
            </div>
            <div className="ml-auto">
              <button
                type="button"
                onClick={handleEditClick}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
              >
                <Edit2 className="h-4 w-4" />
                Edit Layout
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Edit Mode - Show inputs and action buttons */}
            <div className="flex items-center gap-4 flex-1">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Rows:
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={tempRows}
                  onChange={handleTempRowsChange}
                  className="w-20 border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Columns:
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={tempColumns}
                  onChange={handleTempColumnsChange}
                  className="w-20 border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium">Current Seats:</span>{" "}
                {enabledSeatsCount} / {rows * columns}
              </div>
              {tempRows && tempColumns && (
                <div className="text-sm text-gray-500">
                  <span className="font-medium">New Total:</span>{" "}
                  {parseInt(tempRows) * parseInt(tempColumns)} seats
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleApplyChanges}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm"
              >
                <CheckCircle className="h-4 w-4" />
                Apply Changes
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2 text-sm"
              >
                <XCircle className="h-4 w-4" />
                Cancel
              </button>
            </div>
          </>
        )}
      </div>

      {/* Seat Map Grid */}
      <div className="border border-gray-300 rounded-lg p-4 bg-white overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Seat Grid - No headers, centered */}
          <div className="space-y-1">
            {seatMap.map((row, rowIdx) => (
              <div
                key={rowIdx}
                className="flex items-center gap-1 justify-center"
              >
                {/* Seats */}
                {row.map((seat, colIdx) => {
                  const isEditingThisSeat =
                    editingSeatLabel?.row === rowIdx &&
                    editingSeatLabel?.col === colIdx;

                  return (
                    <div key={`${rowIdx}-${colIdx}`} className="relative">
                      {isEditingThisSeat ? (
                        // Input mode for editing seat label
                        <div className="w-12 h-12 flex flex-col items-center justify-center rounded border-2 border-purple-500 bg-purple-50">
                          <input
                            type="text"
                            value={tempSeatLabel}
                            onChange={(e) => {
                              // Convert to uppercase as user types and limit to 6 characters
                              const value = e.target.value.toUpperCase();
                              if (value.length <= 6) {
                                setTempSeatLabel(value);
                                setDuplicateError(""); // Clear error when user types
                              }
                            }}
                            onBlur={saveSeatLabel}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                saveSeatLabel();
                              } else if (e.key === "Escape") {
                                e.preventDefault();
                                cancelSeatLabelEdit();
                              }
                            }}
                            autoFocus
                            className="w-10 h-6 text-xs text-center border border-purple-300 rounded bg-white text-purple-700 font-medium focus:outline-none focus:ring-1 focus:ring-purple-500 uppercase"
                            placeholder="SEAT #"
                            maxLength={6}
                            style={{ textTransform: "uppercase" }}
                          />
                          {duplicateError && (
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 z-10 bg-red-500 text-white text-xs font-semibold px-3 py-1.5 rounded whitespace-nowrap shadow-lg">
                              {duplicateError}
                            </div>
                          )}
                          <div className="flex gap-0.5 mt-0.5">
                            <button
                              type="button"
                              onClick={saveSeatLabel}
                              className="w-4 h-4 flex items-center justify-center bg-green-500 text-white rounded text-[8px] hover:bg-green-600"
                              title="Save (Enter)"
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              onClick={cancelSeatLabelEdit}
                              className="w-4 h-4 flex items-center justify-center bg-red-500 text-white rounded text-[8px] hover:bg-red-600"
                              title="Cancel (Esc)"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ) : (
                        // Normal seat display
                        <button
                          type="button"
                          onClick={(e) => handleSeatClick(rowIdx, colIdx, e)}
                          className={`w-12 h-12 flex flex-col items-center justify-center rounded-md border-2 transition-all shadow-sm ${
                            seat.enabled
                              ? seat.seatLabel
                                ? "bg-emerald-50 border-emerald-500 hover:bg-emerald-100 hover:shadow-md text-emerald-700"
                                : "bg-amber-50 border-amber-400 hover:bg-amber-100 hover:shadow-md text-amber-600"
                              : "bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-400 line-through"
                          }`}
                          title={
                            seat.enabled
                              ? seat.seatLabel
                                ? `${seat.seatLabel} - Click to edit number`
                                : "Click to add seat number"
                              : "Click to enable"
                          }
                        >
                          {seat.enabled ? (
                            seat.seatLabel ? (
                              <span className="text-[10px] font-semibold leading-tight">
                                {seat.seatLabel}
                              </span>
                            ) : (
                              <Plus className="h-4 w-4" />
                            )
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm text-gray-700 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-emerald-50 border-2 border-emerald-500 rounded-md shadow-sm"></div>
          <span className="font-medium">Seat with Number</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-amber-50 border-2 border-amber-400 rounded-md shadow-sm"></div>
          <span className="font-medium">Seat without Number</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-slate-100 border-2 border-slate-300 rounded-md"></div>
          <span className="font-medium">Disabled Seat</span>
        </div>
        <div className="ml-auto text-xs text-gray-500 flex items-center gap-2">
          <Hash className="h-3 w-3" />
          <span>Click on enabled seats to add/edit seat number</span>
        </div>
      </div>

      {/* Seat Labels Display */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="text-xs font-medium text-gray-700 mb-2">
          Seat Labels (for reference):
        </div>
        <div className="text-xs text-gray-600 font-mono">
          {seatMap
            .flatMap((row, rowIdx) =>
              row.filter((seat) => seat.enabled).map((seat) => seat.seatLabel)
            )
            .join(", ")}
        </div>
      </div>
    </div>
  );
};

export default SeatMapEditor;
