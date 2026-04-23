class Access < ApplicationRecord
  belongs_to :account, default: -> { user.account }
  belongs_to :board, touch: true
  belongs_to :user, touch: true

  enum :involvement, %i[ access_only watching ].index_by(&:itself), default: :access_only

  scope :ordered_by_recently_accessed, -> { order(Arel.sql("position IS NULL, position ASC, accessed_at DESC")) }

  after_destroy_commit :clean_inaccessible_data_later

  def accessed
    touch :accessed_at unless recently_accessed?
  end

  def reposition(new_position)
    total = user.accesses.count
    target = new_position.to_i.clamp(1, total)

    transaction do
      ordered = user.accesses.where.not(id: id).ordered_by_recently_accessed.to_a
      ordered.insert(target - 1, self)

      now = Time.current
      ordered.each_with_index do |access, index|
        desired = index + 1
        next if access.position == desired
        access.update_columns(position: desired, updated_at: now)
      end
    end
  end

  private
    def recently_accessed?
      accessed_at&.> 5.minutes.ago
    end

    def clean_inaccessible_data_later
      Board::CleanInaccessibleDataJob.perform_later(user, board) unless user.destroyed?
    end
end
