"use client";

type PaginationProps = {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
};

export default function Pagination({ page, totalPages, onChange }: PaginationProps) {
  return (
    <div className="flex gap-2 justify-center mt-6">
      {Array.from({ length: totalPages }).map((_, i) => {
        const p = i + 1;
        return (
          <button
            key={p}
            className={`px-3 py-1 border rounded ${
              p === page ? "bg-blue-500 text-white" : ""
            }`}
            onClick={() => onChange(p)}
          >
            {p}
          </button>
        );
      })}
    </div>
  );
}
