"use client";

type PaginationProps = {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
};

export default function Pagination({ page, totalPages, onChange }: PaginationProps) {
  if (!totalPages || totalPages < 1) return null

  const handleChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages || nextPage === page) return
    onChange(nextPage)
  }

  return (
    <div className="flex gap-2 justify-center mt-6 items-center">
      <button
        className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={() => handleChange(page - 1)}
        disabled={page <= 1}
      >
        前へ
      </button>
      {Array.from({ length: totalPages }).map((_, i) => {
        const p = i + 1;
        return (
          <button
            key={p}
            className={`px-3 py-1 border rounded transition-colors ${
              p === page
                ? "bg-green-600 text-white border-green-600"
                : "hover:bg-gray-100"
            }`}
            onClick={() => handleChange(p)}
          >
            {p}
          </button>
        );
      })}
      <button
        className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={() => handleChange(page + 1)}
        disabled={page >= totalPages}
      >
        次へ
      </button>
    </div>
  );
}